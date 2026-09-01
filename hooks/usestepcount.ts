'use client';

import { useState, useRef, useCallback } from 'react';

interface DeviceMotionEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const GRAVITY_ALPHA = 0.9;
const PEAK_THRESHOLD = 1.2;       // amplitude gate — फक्त candidate ओळखायला
const TROUGH_RATIO = 0.6;         // पुढचा peak मोजायच्या आधी इथे यायलाच हवं

const STEP_GAP_MIN = 300;         // ms — यापेक्षा जवळचे gaps = same-step bounce
const STEP_GAP_MAX = 800;         // ms — normal चालण्याचा cadence range
const WARMUP_COUNT = 3;           // इतके सलग consistent gaps आल्यावर "walking" confirm

export function useStepCounter() {
  const [steps, setSteps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'listening' | 'walking'>('idle');

  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const lastPeakTime = useRef(0);
  const wasAbove = useRef(false);

  const candidateStreak = useRef(0);     // सलग किती valid-range gaps आले
  const confirmed = useRef(false);       // WARMUP पार झालं का
  const pendingStepCount = useRef(0);    // warmup दरम्यानचे steps (confirm झाल्यावर add करायला)

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

    if (mag > PEAK_THRESHOLD && !wasAbove.current) {
      wasAbove.current = true;
      const gap = now - lastPeakTime.current;

      if (lastPeakTime.current === 0) {
        lastPeakTime.current = now;
        return;
      }

      const inWalkingRange = gap >= STEP_GAP_MIN && gap <= STEP_GAP_MAX;

      if (inWalkingRange) {
        candidateStreak.current += 1;
        pendingStepCount.current += 1;

        if (!confirmed.current && candidateStreak.current >= WARMUP_COUNT) {
          // Warmup पार झालं — साठवलेले सगळे pending steps एकत्र add करा
          confirmed.current = true;
          setSteps((prev) => prev + pendingStepCount.current);
          setStatus('walking');
          pendingStepCount.current = 0;
        } else if (confirmed.current) {
          // आधीच confirmed आहे — प्रत्येक valid peak लगेच count करा
          setSteps((prev) => prev + 1);
          pendingStepCount.current = 0;
        }
      } else {
        // Range बाहेरचा gap — नवीन sequence सुरू करा (पूर्ण reset नाही, फक्त streak)
        candidateStreak.current = 0;
        pendingStepCount.current = 0;
        confirmed.current = false;
        setStatus('listening');
      }

      lastPeakTime.current = now;
    } else if (mag < PEAK_THRESHOLD * TROUGH_RATIO) {
      wasAbove.current = false;
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
    candidateStreak.current = 0;
    confirmed.current = false;
    pendingStepCount.current = 0;
  }, [handleMotion]);

  const reset = useCallback(() => {
    setSteps(0);
    candidateStreak.current = 0;
    confirmed.current = false;
    pendingStepCount.current = 0;
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}