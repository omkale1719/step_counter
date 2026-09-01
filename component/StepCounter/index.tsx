'use client';

import { useWalkTracker } from "@/hooks/useWalkTracker";

// import { useWalkTracker } from './useWalkTracker';

export default function StepCounter() {
  const { steps, distanceMeters, confidence, status, error, start, stop, reset } =
    useWalkTracker();

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2 style={{ fontSize: '3rem', margin: 0 }}>{steps}</h2>
      <p style={{ color: '#888' }}>steps · status: {status}</p>
      <p style={{ color: '#888' }}>{distanceMeters.toFixed(1)} m (GPS)</p>
      {confidence !== null && (
        <p style={{ color: '#aaa' }}>
          Accuracy confidence: {(confidence * 100).toFixed(0)}%
        </p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={start}>Start</button>
        <button onClick={stop}>Stop</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}