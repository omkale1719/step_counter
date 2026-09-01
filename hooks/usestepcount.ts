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

const PEAK_THRESHOLD = 1.8;      // यापेक्षा वर गेलं तरच peak candidate
const REJECT_THRESHOLD = 12.0;   // यापेक्षा वर = shake/drop, ignore
const TROUGH_THRESHOLD = 0.6;    // पुढचा peak मोजायच्या आधी इथे यायलाच हवं (hysteresis)

const MIN_STEP_INTERVAL = 300;
const MAX_STEP_INTERVAL = 2000;

const ENERGY_WINDOW_MS = 1000;   // 1 सेकंदाचा rolling window
const ENERGY_STD_MIN = 0.5;      // यापेक्षा कमी std-dev = "no real motion"

export function useStepCounter(): UseStepCounterReturn {
  const [steps, setSteps] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StepCounterState['status']>('idle');

  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const smoothedMag = useRef<number>(0);
  const lastStepTime = useRef<number>(0);
  const awaitingTrough = useRef<boolean>(false); // peak झाला, trough ची वाट बघतोय

  // Motion-energy window साठी buffer: [{t, mag}]
  const magHistory = useRef<{ t: number; mag: number }[]>([]);

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

    const now = Date.now();
    const mag = smoothedMag.current;

    // --- Motion-energy gate: rolling window मध्ये std-dev काढा ---
    magHistory.current.push({ t: now, mag });
    while (
      magHistory.current.length > 0 &&
      now - magHistory.current[0].t > ENERGY_WINDOW_MS
    ) {
      magHistory.current.shift();
    }
    const values = magHistory.current.map((h) => h.mag);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const hasRealMotion = stdDev > ENERGY_STD_MIN;

    if (!hasRealMotion) {
      // हातातला हलकासा shake — इथेच बहुतेक false positives थांबतात
      setStatus((s) => (s === 'walking' ? 'listening' : s));
      return;
    }

    // --- Reject extreme spikes (drop/hard shake) ---
    if (mag > REJECT_THRESHOLD) return;

    // --- Hysteresis peak detection ---
    if (!awaitingTrough.current && mag > PEAK_THRESHOLD) {
      const gap = now - lastStepTime.current;

      if (gap > MIN_STEP_INTERVAL && gap < MAX_STEP_INTERVAL) {
        setSteps((prev) => prev + 1);
        setStatus('walking');
        lastStepTime.current = now;
      } else if (gap >= MAX_STEP_INTERVAL) {
        // पहिलाच valid peak या sequence मधला — count करा, gap track सुरू करा
        setSteps((prev) => prev + 1);
        setStatus('walking');
        lastStepTime.current = now;
      }
      awaitingTrough.current = true; // पुढचा peak मोजायच्या आधी आधी trough लागेल
    } else if (awaitingTrough.current && mag < TROUGH_THRESHOLD) {
      awaitingTrough.current = false; // आता पुढचा peak valid candidate आहे
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
    magHistory.current = [];
  }, [handleMotion]);

  const reset = useCallback((): void => {
    setSteps(0);
    magHistory.current = [];
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}