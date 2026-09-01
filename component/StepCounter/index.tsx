'use client';
import { useStepCounter } from "@/hooks/usestepcount";

export default function StepCounter() {
  const {
    steps, isTracking, error, status, start, stop, reset,
    liveMagnitude, peakSeen, setPeakSeen,
    peakThreshold, setPeakThreshold,
  } = useStepCounter();

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2 style={{ fontSize: '3rem', margin: 0 }}>{steps}</h2>
      <p style={{ color: '#888' }}>steps · status: {status}</p>

      {/* --- DEBUG PANEL: calibration नंतर काढून टाका --- */}
      <div style={{ background: '#eee', padding: '1rem', margin: '1rem 0', borderRadius: 8, color: '#000' }}>
        <p>Live: <b>{liveMagnitude.toFixed(2)}</b></p>
        <p>आत्तापर्यंतचा highest: <b>{peakSeen.toFixed(2)}</b></p>
        <button onClick={() => setPeakSeen(0)}>Reset peak</button>
        <br /><br />
        <label>
          Threshold: {peakThreshold.toFixed(1)}
          <input
            type="range" min="0.3" max="5" step="0.1"
            value={peakThreshold}
            onChange={(e) => setPeakThreshold(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </label>
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