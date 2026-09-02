'use client';
import { useStepCounter } from "@/hooks/usestepcount";
import { useGeoDistance } from "@/hooks/useGeoDistance";

const STATUS_COPY: Record<string, string> = {
  idle: 'ready to go',
  listening: 'listening for movement',
  walking: 'walking',
};

export default function StepCounter() {
  const { steps, isTracking, error, status, start, stop, reset } = useStepCounter();
const geo = useGeoDistance(); // ← नवीन ओळ

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.55; }
          70%  { transform: scale(1.28); opacity: 0; }
          100% { transform: scale(1.28); opacity: 0; }
        }
        @keyframes driftDot {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-ring, .status-dot { animation: none !important; }
        }
        .primary-btn:focus-visible, .secondary-btn:focus-visible {
          outline: 2px solid #E8A33D;
          outline-offset: 3px;
        }
        .primary-btn:active { transform: translateY(1px); }
        .secondary-btn:active { transform: translateY(1px); }
      `}</style>

      {/* faint topographic contour field */}
      <svg
        viewBox="0 0 400 500"
        style={styles.contours}
        aria-hidden="true"
      >
        <path d="M-20 90 Q 100 40, 220 90 T 440 90" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.06" />
        <path d="M-20 140 Q 110 70, 230 140 T 440 140" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.05" />
        <path d="M-20 190 Q 90 130, 210 190 T 440 190" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.04" />
        <path d="M-20 370 Q 100 320, 220 370 T 440 370" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.04" />
        <path d="M-20 420 Q 110 460, 230 420 T 440 420" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.05" />
      </svg>

      <div style={styles.card}>
        <div style={styles.statusPill}>
          <span
            className="status-dot"
            style={{
              ...styles.statusDot,
              background: status === 'walking' ? '#E8A33D' : '#8FA396',
              animation: status === 'walking' ? 'driftDot 0.6s ease-in-out infinite' : 'none',
            }}
          />
          <span style={styles.statusText}>{STATUS_COPY[status] ?? status}</span>
        </div>

        <div style={styles.numberWrap}>
          {status === 'walking' && (
            <span className="pulse-ring" style={styles.pulseRing} aria-hidden="true" />
          )}
          <h2 style={styles.stepNumber}>{steps.toLocaleString()}</h2>
        </div>
        <p style={styles.stepLabel}>steps</p>

        {error && <p style={styles.errorText}>{error}</p>}

        <div style={styles.actions}>
          {!isTracking ? (
  <button
    className="primary-btn"
    style={styles.primaryBtn}
    onClick={() => { start(); geo.start(); }}  
  >
    Start tracking
  </button>
) : (
  <button
    className="primary-btn"
    style={styles.primaryBtnActive}
    onClick={() => { stop(); geo.stop(); }}  
  >
    Stop
  </button>
)}
<button
  className="secondary-btn"
  style={styles.secondaryBtn}
  onClick={() => { reset(); geo.reset(); }}  
>
  Reset
</button>



<p style={styles.stepLabel}>steps</p>
<p style={styles.distanceLabel}>
  {(geo.distanceMeters / 1000).toFixed(2)} km
  {geo.accuracy !== null && ` · ±${geo.accuracy.toFixed(0)}m accuracy`}
</p>





        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  
distanceLabel: {
  color: '#8FA396',
  fontSize: '0.8rem',
  marginTop: '-1.8rem',
  marginBottom: '2rem',
},

  page: {
    position: 'relative',
    minHeight: '100vh',
    background: '#16211C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    overflow: 'hidden',
  },
  contours: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 340,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2.5rem 1.5rem',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.9rem',
    borderRadius: 999,
    background: 'rgba(241, 239, 231, 0.06)',
    border: '1px solid rgba(241, 239, 231, 0.1)',
    marginBottom: '2.5rem',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    color: '#8FA396',
    fontSize: '0.8rem',
    letterSpacing: '0.01em',
  },
  numberWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '1.5px solid #E8A33D',
    animation: 'pulseRing 1.4s ease-out infinite',
  },
  stepNumber: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontVariantNumeric: 'tabular-nums',
    fontSize: 'clamp(3.5rem, 18vw, 4.75rem)',
    fontWeight: 600,
    color: '#F1EFE7',
    margin: 0,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  stepLabel: {
    color: '#8FA396',
    fontSize: '0.95rem',
    marginTop: '0.6rem',
    marginBottom: '2.5rem',
  },
  errorText: {
    color: '#E8614A',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    maxWidth: 280,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
  },
  primaryBtn: {
    width: '100%',
    padding: '0.9rem 1.5rem',
    borderRadius: 999,
    border: 'none',
    background: '#E8A33D',
    color: '#16211C',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  primaryBtnActive: {
    width: '100%',
    padding: '0.9rem 1.5rem',
    borderRadius: 999,
    border: '1px solid #E8A33D',
    background: 'transparent',
    color: '#E8A33D',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  secondaryBtn: {
    width: '100%',
    padding: '0.9rem 1.5rem',
    borderRadius: 999,
    border: '1px solid rgba(241, 239, 231, 0.15)',
    background: 'transparent',
    color: '#8FA396',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
};