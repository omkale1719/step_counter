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
const previousGapInRange = useRef(false); // मागचा gap range मध्ये होता का

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

    if (gap < STEP_GAP_MIN) {
      // खूप जवळचा gap = आधीच्याच पावलाचा bounce — पूर्णपणे ignore, वेळ अपडेट नाही
      return;
    }

    if (gap <= STEP_GAP_MAX) {
      // Valid walking-range gap
      if (previousGapInRange.current) {
        // मागचाही gap range मध्ये होता → खरी sequence चालू आहे → count करा
        setSteps((prev) => prev + 1);
        setStatus('walking');
      }
      // मागचा गॅप range मध्ये नव्हता (sequence ची सुरुवात) → हा फक्त "confirm" म्हणून वापरा, count नाही
      previousGapInRange.current = true;
    } else {
      // गॅप खूप मोठा (चालणं थांबलं/pause) → sequence तुटली, परत सुरुवातीपासून
      previousGapInRange.current = false;
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
   
  }, [handleMotion]);

  const reset = useCallback(() => {
    setSteps(0);
    
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}