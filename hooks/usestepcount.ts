'use client';

import { useState, useRef, useCallback } from 'react';

interface StepCounterState {
  steps: number;
  isTracking: boolean;
  error: string | null;
  status: 'idle' | 'listening' | 'walking';
}

interface UseStepCounterReturn extends StepCounterState {
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

interface DeviceMotionEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export function useStepCounter(): UseStepCounterReturn {
  const [steps, setSteps] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StepCounterState['status']>('idle');

  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const smoothedMag = useRef<number>(0);
  const lastStepTime = useRef<number>(0);
  const isAboveThreshold = useRef<boolean>(false);
  const recentGaps = useRef<number[]>([]);       // last few step-to-step gaps
  const consecutiveValidSteps = useRef<number>(0); // सलग किती consistent steps आले

  const ALPHA = 0.8;

  // दोन्ही bounds — फार कमी (shake नाही) आणि फार जास्त (drop/shake नाही)
  const LOWER_THRESHOLD = 1.0;
  const UPPER_THRESHOLD = 6.0;

  const MIN_STEP_INTERVAL = 250;   // ms
  const MAX_STEP_INTERVAL = 900;   // ms — यापेक्षा जास्त gap म्हणजे चालणं थांबलं
  const GAP_TOLERANCE = 0.4;        // मागच्या gap च्या ±40% च्या आत असावं
  const WARMUP_STEPS = 2;           // इतके consistent peaks आल्यावरच मोजणं सुरू करा

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    gravity.current.x = ALPHA * gravity.current.x + (1 - ALPHA) * acc.x;
    gravity.current.y = ALPHA * gravity.current.y + (1 - ALPHA) * acc.y;
    gravity.current.z = ALPHA * gravity.current.z + (1 - ALPHA) * acc.z;

    const linX = acc.x - gravity.current.x;
    const linY = acc.y - gravity.current.y;
    const linZ = acc.z - gravity.current.z;

    const magnitude = Math.sqrt(linX * linX + linY * linY + linZ * linZ);
    smoothedMag.current = smoothedMag.current * 0.7 + magnitude * 0.3;

    const now = Date.now();
    const mag = smoothedMag.current;

    // Peak detection — दोन्ही bounds च्या मध्येच असावं
    const inWalkingRange = mag > LOWER_THRESHOLD && mag < UPPER_THRESHOLD;

    if (inWalkingRange && !isAboveThreshold.current) {
      isAboveThreshold.current = true;
      const gap = now - lastStepTime.current;

      if (gap > MIN_STEP_INTERVAL && gap < MAX_STEP_INTERVAL) {
        // मागच्या gap शी तुलना — periodicity check
        const lastGap = recentGaps.current[recentGaps.current.length - 1];
        const isConsistent =
          !lastGap || Math.abs(gap - lastGap) / lastGap < GAP_TOLERANCE;

        if (isConsistent) {
          consecutiveValidSteps.current += 1;
          recentGaps.current.push(gap);
          if (recentGaps.current.length > 5) recentGaps.current.shift();

          // सलग WARMUP_STEPS consistent peaks आल्यावरच प्रत्यक्ष count करा
          if (consecutiveValidSteps.current >= WARMUP_STEPS) {
            setSteps((prev) => prev + 1);
            setStatus('walking');
          }
        } else {
          // Gap खूप वेगळा — नवीन sequence म्हणून reset करा
          consecutiveValidSteps.current = 1;
          recentGaps.current = [gap];
        }
        lastStepTime.current = now;
      } else if (gap >= MAX_STEP_INTERVAL) {
        // बराच वेळ movement नाही — चालणं थांबलं, sequence reset
        consecutiveValidSteps.current = 0;
        recentGaps.current = [];
        setStatus('listening');
        lastStepTime.current = now;
      }
    } else if (mag < LOWER_THRESHOLD * 0.7) {
      isAboveThreshold.current = false;
    }
  }, []);

  const start = useCallback(async (): Promise<void> => {
    setError(null);

    if (typeof window === 'undefined' || !window.DeviceMotionEvent) {
      setError('हे डिव्हाइस/ब्राउझर motion sensor support करत नाही.');
      return;
    }

    const DeviceMotionEventTyped = DeviceMotionEvent as unknown as DeviceMotionEventConstructorWithPermission;

    if (typeof DeviceMotionEventTyped.requestPermission === 'function') {
      try {
        const result = await DeviceMotionEventTyped.requestPermission();
        if (result !== 'granted') {
          setError('Motion sensor permission नाकारली गेली.');
          return;
        }
      } catch (err) {
        setError('Permission request failed: ' + (err as Error).message);
        return;
      }
    }
    // Android वर इथे काहीच होत नाही — permission आधीच उपलब्ध असते, हे normal आहे

    window.addEventListener('devicemotion', handleMotion);
    setIsTracking(true);
    setStatus('listening');
  }, [handleMotion]);

  const stop = useCallback((): void => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion);
    }
    setIsTracking(false);
    setStatus('idle');
    consecutiveValidSteps.current = 0;
    recentGaps.current = [];
  }, [handleMotion]);

  const reset = useCallback((): void => {
    setSteps(0);
    consecutiveValidSteps.current = 0;
    recentGaps.current = [];
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}