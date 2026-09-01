'use client';

import { useState, useRef, useCallback } from 'react';

interface DeviceMotionEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const GRAVITY_ALPHA = 0.9;
const PEAK_DETECT_THRESHOLD = 1.0; // फक्त "काहीतरी peak झालं" ओळखण्यासाठी, कमी ठेवलाय

export function useStepCounter() {
  const [steps, setSteps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'listening' | 'walking'>('idle');

  const [liveMagnitude, setLiveMagnitude] = useState(0);
  const [peakSeen, setPeakSeen] = useState(0);
  const [recentGaps, setRecentGaps] = useState<number[]>([]); // ← नवीन: last 8 gaps (ms)

  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const lastPeakTime = useRef(0);
  const wasAbove = useRef(false);

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
    setLiveMagnitude(mag);
    setPeakSeen((prev) => Math.max(prev, mag));

        const now = Date.now();

    // साधं peak detection — आता debounce सह (एका पावलाचे bounce वेगळे मोजले जाऊ नयेत)
    if (mag > PEAK_DETECT_THRESHOLD && !wasAbove.current) {
      wasAbove.current = true;
      const gap = now - lastPeakTime.current;

      if (lastPeakTime.current === 0 || gap > 300) {
        // 300ms च्या आत आलेला peak म्हणजे मागच्याच पावलाचा bounce — तो ignore करा
        if (lastPeakTime.current > 0) {
          setRecentGaps((prev) => [...prev.slice(-7), gap]);
        }
        lastPeakTime.current = now;
      }
      // gap <= 300 असेल तर lastPeakTime अपडेटच करू नका — तो bounce होता
    } else if (mag < PEAK_DETECT_THRESHOLD * 0.6) {
      wasAbove.current = false;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === 'undefined' || !window.DeviceMotionEvent) {
      setError('Motion sensor supported नाही.');
      return;
    }
    const DME = DeviceMotionEvent as unknown as DeviceMotionEventConstructorWithPermission;
    if (typeof DME.requestPermission === 'function') {
      const result = await DME.requestPermission();
      if (result !== 'granted') {
        setError('Permission नाकारली.');
        return;
      }
    }
    window.addEventListener('devicemotion', handleMotion);
    setIsTracking(true);
    setStatus('listening');
  }, [handleMotion]);

  const stop = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotion);
    setIsTracking(false);
    setStatus('idle');
  }, [handleMotion]);

  const reset = useCallback(() => {
    setSteps(0);
    setPeakSeen(0);
    setRecentGaps([]);
  }, []);

  return {
    steps, isTracking, error, status, start, stop, reset,
    liveMagnitude, peakSeen, setPeakSeen, recentGaps, setRecentGaps,
  };
}