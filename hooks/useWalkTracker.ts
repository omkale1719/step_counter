'use client';

import { useMemo } from 'react';
// import { useStepCounter } from './useStepCounter';
import { useGeoDistance } from './useGeoDistance';
import { useStepCounter } from './usestepcount';

const AVG_STRIDE_METERS = 0.75; // सरासरी माणसाची stride length

export function useWalkTracker() {
  const stepCounter = useStepCounter();
  const geo = useGeoDistance();

  // GPS distance वरून अंदाजे expected steps
  const estimatedStepsFromGPS = useMemo(
    () => Math.round(geo.distanceMeters / AVG_STRIDE_METERS),
    [geo.distanceMeters]
  );

  // Sensor count आणि GPS estimate किती जुळतात — 0 ते 1 दरम्यान confidence
  const confidence = useMemo(() => {
    if (estimatedStepsFromGPS < 5) return null; // पुरेसा GPS data नाही अजून
    const diff = Math.abs(stepCounter.steps - estimatedStepsFromGPS);
    const ratio = 1 - diff / Math.max(estimatedStepsFromGPS, 1);
    return Math.max(0, Math.min(1, ratio));
  }, [stepCounter.steps, estimatedStepsFromGPS]);

  const start = async () => {
    await stepCounter.start();
    geo.start(); // GPS permission वेगळी मागितली जाईल (browser location prompt)
  };

  const stop = () => {
    stepCounter.stop();
    geo.stop();
  };

  const reset = () => {
    stepCounter.reset();
    geo.reset();
  };

  return {
    steps: stepCounter.steps,
    distanceMeters: geo.distanceMeters,
    estimatedStepsFromGPS,
    confidence, // null = अजून पुरेसा GPS data नाही, नाहीतर 0-1 (1 = चांगलं जुळतंय)
    status: stepCounter.status,
    error: stepCounter.error || geo.error,
    start,
    stop,
    reset,
  };
}