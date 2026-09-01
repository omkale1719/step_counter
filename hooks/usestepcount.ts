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

const ALPHA = 0.9;
const SMOOTH_FACTOR = 0.3;

const PEAK_THRESHOLD = 1.3;
const TROUGH_THRESHOLD = 0.5;
const REJECT_THRESHOLD = 12.0;

const MIN_STEP_INTERVAL = 250;
const MAX_STEP_INTERVAL = 1000; // सामान्य चालण्याचा gap 300-800ms; यापेक्षा जास्त = sequence तुटली

const GAP_WINDOW = 4;           // periodicity check साठी किती मागचे gaps वापरायचे
const CV_THRESHOLD = 0.35;      // coefficient of variation — यापेक्षा कमी असेल तरच "regular" धरा
const CONFIRMED_STEPS_TO_START = 3; // इतके regular peaks आले की मगच "चालणं सुरू झालं" धरा

export function useStepCounter(): UseStepCounterReturn {
  const [steps, setSteps] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StepCounterState['status']>('idle');

  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const smoothedMag = useRef<number>(0);
  const awaitingTrough = useRef<boolean>(false);
  const lastPeakTime = useRef<number>(0);

  const gapBuffer = useRef<number[]>([]);      // rolling gaps (candidate sequence)
  const isWalkingConfirmed = useRef<boolean>(false);
  const pendingSteps = useRef<number>(0);      // confirm होईपर्यंत तात्पुरते साठवलेले steps

  const computeCV = (arr: number[]): number => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance) / mean;
  };

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    gravity.current.x = ALPHA * gravity.current.x + (1 - ALPHA) * acc.x;
    gravity.current.y = ALPHA * gravity.current.y + (1 - ALPHA) * acc.y;
    gravity.current.z = ALPHA * gravity.current.z + (1 - ALPHA) * acc.z;

    const linX = acc.x - gravity.current.x;
    const linY = acc.y - gravity.current.y;
    const linZ = acc.z - gravity.current.z;

    const rawMag = Math.sqrt(linX * linX + linY * linY + linZ * linZ);
    smoothedMag.current =
      smoothedMag.current * (1 - SMOOTH_FACTOR) + rawMag * SMOOTH_FACTOR;

    const mag = smoothedMag.current;
    const now = Date.now();

    if (mag > REJECT_THRESHOLD) return;

    // --- Hysteresis peak detection ---
    if (!awaitingTrough.current && mag > PEAK_THRESHOLD) {
      awaitingTrough.current = true;

      const gap = now - lastPeakTime.current;
      lastPeakTime.current = now;

      if (gap < MIN_STEP_INTERVAL) return; // खूप जवळचे double-peaks ignore

      if (gap > MAX_STEP_INTERVAL) {
        // sequence तुटली — नव्याने सुरुवात
        gapBuffer.current = [];
        pendingSteps.current = 0;
        isWalkingConfirmed.current = false;
        setStatus('listening');
        return;
      }

      gapBuffer.current.push(gap);
      if (gapBuffer.current.length > GAP_WINDOW) gapBuffer.current.shift();
      pendingSteps.current += 1;

      // --- Periodicity check ---
      if (gapBuffer.current.length >= 3) {
        const cv = computeCV(gapBuffer.current);

        if (cv < CV_THRESHOLD) {
          // Regular rhythm आहे — हे खरं चालणं आहे
          if (!isWalkingConfirmed.current) {
            if (pendingSteps.current >= CONFIRMED_STEPS_TO_START) {
              // आत्ताच confirm झालं — आतापर्यंत साठवलेले सगळे pending steps एकदम add करा
              setSteps((prev) => prev + pendingSteps.current);
              isWalkingConfirmed.current = true;
              setStatus('walking');
            }
            // अजून confirm झालं नाही — वाट बघा, पण pendingSteps वाढतच राहतील
          } else {
            // आधीच चालणं confirm आहे — प्रत्येक नवीन regular peak लगेच count करा
            setSteps((prev) => prev + 1);
          }
        } else {
          // अनियमित — हे random हलणं, चालणं तुटलं असं धरा
          isWalkingConfirmed.current = false;
          pendingSteps.current = 0;
          gapBuffer.current = [gap]; // पूर्ण reset न करता नवीन gap पासून सुरू ठेवा
          setStatus('listening');
        }
      }
    } else if (awaitingTrough.current && mag < TROUGH_THRESHOLD) {
      awaitingTrough.current = false;
    }
  }, []);

  const start = useCallback(async (): Promise<void> => {
    setError(null);
    if (typeof window === 'undefined' || !window.DeviceMotionEvent) {
      setError('हे डिव्हाइस/ब्राउझर motion sensor support करत नाही.');
      return;
    }
    const DeviceMotionEventTyped =
      DeviceMotionEvent as unknown as DeviceMotionEventConstructorWithPermission;
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
  }, [handleMotion]);

  const reset = useCallback((): void => {
    setSteps(0);
    gapBuffer.current = [];
    pendingSteps.current = 0;
    isWalkingConfirmed.current = false;
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}