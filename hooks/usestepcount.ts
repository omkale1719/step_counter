'use client';

import { useState, useRef, useCallback } from 'react';

interface DeviceMotionEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const GRAVITY_ALPHA = 0.9;
const TROUGH_THRESHOLD = 0.5;
const PEAK_THRESHOLD = 2.5; // calibrated value

// चालण्याची लय (cadence) ओळखण्यासाठी — साधारण मानवी चालण्याचा वेग
// ६०-२०० steps/min च्या दरम्यान असतो, म्हणजे दोन steps मधलं अंतर
// साधारण 300ms ते 1000ms च्या रेंजमध्ये असायला हवं.
const MIN_STEP_INTERVAL = 300; // यापेक्षा जवळचे peaks = नुसता noise/shake
const MAX_STEP_INTERVAL = 1000; // यापेक्षा लांबचे peaks = लय तुटली, चालणं नाही

// एकच jerk/धक्का हा step समजू नये म्हणून — सलग इतके peaks सुसंगत
// अंतराने आले तरच ते "चालणं" आहे असं मानायचं.
const STEPS_TO_CONFIRM_WALKING = 2;

// इतका वेळ कुठलाही वैध peak आला नाही, तर लय तुटली असं समजून
// परत "listening" स्थितीत जायचं.
const WALKING_TIMEOUT = 1500;

export function useStepCounter() {
  const [steps, setSteps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'listening' | 'walking'>('idle');

  const gravity = useRef({ x: 0, y: 0, z: 0 });
  const lastPeakTime = useRef(0);
  const awaitingTrough = useRef(false);

  // सलग किती peaks सुसंगत अंतराने आले याचा counter — जोपर्यंत हा
  // STEPS_TO_CONFIRM_WALKING पर्यंत पोहोचत नाही, तोपर्यंत प्रत्यक्ष
  // step count वाढणार नाही.
  const consecutiveValidPeaks = useRef(0);
  const isConfirmedWalking = useRef(false);
  const walkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWalkingTimeout = useCallback(() => {
    if (walkingTimeoutRef.current) {
      clearTimeout(walkingTimeoutRef.current);
      walkingTimeoutRef.current = null;
    }
  }, []);

  const armWalkingTimeout = useCallback(() => {
    clearWalkingTimeout();
    walkingTimeoutRef.current = setTimeout(() => {
      // ठराविक वेळेत नवीन peak आला नाही -> चालणं थांबलं
      consecutiveValidPeaks.current = 0;
      isConfirmedWalking.current = false;
      setStatus((prev) => (prev === 'walking' ? 'listening' : prev));
    }, WALKING_TIMEOUT);
  }, [clearWalkingTimeout]);

  const registerPeak = useCallback((now: number) => {
    const gap = now - lastPeakTime.current;

    if (lastPeakTime.current === 0 || gap < MIN_STEP_INTERVAL) {
      // पहिलाच peak, किंवा खूप जवळचा peak (हलकासा shake/noise) —
      // यावर विश्वास ठेवायचा नाही.
      lastPeakTime.current = now;
      if (gap !== 0 && gap < MIN_STEP_INTERVAL) {
        // खूप जवळचे peaks आले तर लय तुटलेली मानून पुन्हा सुरुवातीपासून मोजा.
        consecutiveValidPeaks.current = 0;
        isConfirmedWalking.current = false;
      }
      return;
    }

    if (gap > MAX_STEP_INTERVAL) {
      // खूप वेळाने आलेला peak — नवीन लय सुरू म्हणून मोजा, आधीची लय गणतीत नाही.
      consecutiveValidPeaks.current = 1;
      isConfirmedWalking.current = false;
      lastPeakTime.current = now;
      return;
    }

    // गॅप योग्य रेंजमध्ये आहे — ही खऱ्या चालण्याच्या लयीसारखी दिसते.
    consecutiveValidPeaks.current += 1;
    lastPeakTime.current = now;

    if (!isConfirmedWalking.current && consecutiveValidPeaks.current >= STEPS_TO_CONFIRM_WALKING) {
      // लय आता confirm झाली — मागे राहिलेले confirm-न-झालेले steps पकडून मोजा
      // (कारण पहिला/दुसरा peak फक्त confirmation साठी वापरला, पण तोही खरा step होता).
      isConfirmedWalking.current = true;
      setSteps((prev) => prev + STEPS_TO_CONFIRM_WALKING);
      setStatus('walking');
    } else if (isConfirmedWalking.current) {
      setSteps((prev) => prev + 1);
      setStatus('walking');
    }

    armWalkingTimeout();
  }, [armWalkingTimeout]);

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
      registerPeak(now);
      awaitingTrough.current = true;
    } else if (awaitingTrough.current && mag < TROUGH_THRESHOLD) {
      awaitingTrough.current = false;
    }
  }, [registerPeak]);

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

    lastPeakTime.current = 0;
    consecutiveValidPeaks.current = 0;
    isConfirmedWalking.current = false;
    awaitingTrough.current = false;

    window.addEventListener('devicemotion', handleMotion);
    setIsTracking(true);
    setStatus('listening');
  }, [handleMotion]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', handleMotion);
    }
    clearWalkingTimeout();
    setIsTracking(false);
    setStatus('idle');
  }, [handleMotion, clearWalkingTimeout]);

  const reset = useCallback(() => {
    setSteps(0);
    lastPeakTime.current = 0;
    consecutiveValidPeaks.current = 0;
    isConfirmedWalking.current = false;
  }, []);

  return { steps, isTracking, error, status, start, stop, reset };
}