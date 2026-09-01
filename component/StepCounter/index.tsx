'use client';
import { useStepCounter } from "@/hooks/usestepcount";

export default function StepCounter() {
  const {
    steps, isTracking, error, status, start, stop, reset,
    liveMagnitude, peakSeen, setPeakSeen, recentGaps, setRecentGaps,
  } = useStepCounter();

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2 style={{ fontSize: '3rem', margin: 0 }}>{steps}</h2>
      <p style={{ color: '#888' }}>status: {status}</p>

      <div style={{ background: '#eee', padding: '1rem', margin: '1rem 0', borderRadius: 8, color: '#000' }}>
        <p>Live: <b>{liveMagnitude.toFixed(2)}</b> | Highest: <b>{peakSeen.toFixed(2)}</b></p>
        <button onClick={() => setPeakSeen(0)}>Reset peak</button>
        <button onClick={() => setRecentGaps([])} style={{ marginLeft: 8 }}>Reset gaps</button>
        <p style={{ marginTop: '0.5rem' }}>
          Recent gaps (ms): <b>{recentGaps.join(', ') || '—'}</b>
        </p>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
        {!isTracking ? (
          <button onClick={start}>Start Tracking</button>
        ) : (
          <button onClick={stop}>Stop</button>
        )}
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}