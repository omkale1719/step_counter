'use client'; // Next.js साठी गरजेचं, plain React (Vite/CRA) मध्ये harmless

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

// iOS 13+ चं requestPermission सध्याच्या TS DOM types मध्ये नसतं, म्हणून extend करतो
interface DeviceMotionEventiOS extends DeviceMotionEvent {}
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

  const ALPHA = 0.8;
  const THRESHOLD = 1.2;
  const MIN_STEP_INTERVAL = 300;

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

    if (smoothedMag.current > THRESHOLD && !isAboveThreshold.current) {
      isAboveThreshold.current = true;
      if (now - lastStepTime.current > MIN_STEP_INTERVAL) {
        lastStepTime.current = now;
        setSteps((prev) => prev + 1);
        setStatus('walking');
      }
    } else if (smoothedMag.current < THRESHOLD * 0.6) {
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
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}