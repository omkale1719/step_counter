'use client';

import { useStepCounter } from "@/hooks/usestepcount";

// import { useStepCounter } from './useStepCounter';

export default function StepCounter() {
  const {
    steps, isTracking, error, status, start, stop, reset,
    liveMagnitude, peakThreshold, setPeakThreshold,
  } = useStepCounter();

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2 style={{ fontSize: '3rem', margin: 0 }}>{steps}</h2>
      <p>status: {status}</p>

      {/* --- DEBUG PANEL: calibration नंतर काढून टाका --- */}
      <div style={{ background: '#eee', padding: '1rem', margin: '1rem 0', borderRadius: 8 }}>
        <p>Live magnitude: <b>{liveMagnitude.toFixed(2)}</b></p>
        <label>
          Peak threshold: {peakThreshold.toFixed(1)}
          <input
            type="range" min="0.3" max="5" step="0.1"
            value={peakThreshold}
            onChange={(e) => setPeakThreshold(Number(e.target.value))}
          />
        </label>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {!isTracking ? <button onClick={start}>Start</button> : <button onClick={stop}>Stop</button>}
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}