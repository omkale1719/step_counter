'use client';
import { useStepCounter } from "@/hooks/usestepcount";

 // Next.js साठी गरजेचं, plain React मध्ये harmless

// import { useStepCounter } from './useStepCounter';

export default function StepCounter() {
  const { steps, isTracking, error, status, start, stop, reset } = useStepCounter();

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h2 style={{ fontSize: '3rem', margin: 0 }}>{steps}</h2>
      <p style={{ color: '#888' }}>steps · status: {status}</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
        {!isTracking ? (
          <button onClick={start}>Start Tracking</button>
        ) : (
          <button onClick={stop}>Stop</button>
        )}
        <button onClick={reset}>Reset</button>
      </div>

      {!isTracking && (
        <p style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '1rem' }}>
          फक्त mobile browser वर काम करेल (HTTPS आवश्यक). iOS वर Start केल्यावर permission popup येईल.
        </p>
      )}
    </div>
  );
}