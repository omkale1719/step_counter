'use client';

import { useState, useRef, useCallback } from 'react';

interface DeviceMotionEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const GRAVITY_ALPHA = 0.9;
const TROUGH_THRESHOLD = 0.5;
const MIN_STEP_INTERVAL = 300;
const PEAK_THRESHOLD = 2.5; // calibrated value

export function useStepCounter() {
  const [steps, setSteps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'listening' | 'walking'>('idle');

  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const lastStepTime = useRef(0);
  const awaitingTrough = useRef(false);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    gravity.current.x = GRAVITY_ALPHA * gravity.current.x + (1 - GRAVITY_ALPHA) * acc.x;
    gravity.current.y = GRAVITY_ALPHA * gravity.current.y + (1 - GRAVITY_ALPHA) * acc.y;
    gravity.current.z = GRAVITY_ALPHA * gravity.current.z + (1 - GRAVITY_ALPHA) * acc.z;

    const linX = acc.x - gravity.current.x;
    const linY = acc.y - gravity.current.y;
    const linZ = acc.z - gravity.current.z;

    const mag = Math.sqrt(linX * linX + linY * linY + linZ * linZ);

    const now = Date.now();

    if (!awaitingTrough.current && mag > PEAK_THRESHOLD) {
      const gap = now - lastStepTime.current;
      if (gap > MIN_STEP_INTERVAL) {
        setSteps((prev) => prev + 1);
        setStatus('walking');
        lastStepTime.current = now;
      }
      awaitingTrough.current = true;
    } else if (awaitingTrough.current && mag < TROUGH_THRESHOLD) {
      awaitingTrough.current = false;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === 'undefined' || !window.DeviceMotionEvent) {
      setError('हे डिव्हाइस/ब्राउझर motion sensor support करत नाही.');
      return;
    }
    const DME = DeviceMotionEvent as unknown as DeviceMotionEventConstructorWithPermission;
    if (typeof DME.requestPermission === 'function') {
      try {
        const result = await DME.requestPermission();
        if (result !== 'granted') {
          setError('Permission नाकारली गेली.');
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

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion);
    }
    setIsTracking(false);
    setStatus('idle');
  }, [handleMotion]);

  const reset = useCallback(() => {
    setSteps(0);
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}