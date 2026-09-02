'use client';

import { useStepCounter } from "@/hooks/usestepcount";
import { useGeoDistance } from "@/hooks/useGeoDistance";
import WalkMap from "@/component/WalkMap";

const STATUS_COPY: Record<string, string> = {
  idle: 'Ready to go',
  listening: 'Listening for movement',
  walking: 'Walking',
};

export default function StepCounter() {
  const {
    steps,
    isTracking,
    error,
    status,
    start,
    stop,
    reset,
  } = useStepCounter();

  const geo = useGeoDistance();
  const km = geo.distanceMeters / 1000;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.5; }
          70%  { transform: scale(1.3);  opacity: 0; }
          100% { transform: scale(1.3);  opacity: 0; }
        }

        @keyframes driftDot {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(3px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .pulse-ring,
          .status-dot {
            animation: none !important;
          }
        }

        .primary-btn:focus-visible,
        .secondary-btn:focus-visible {
          outline: 2px solid #E8A33D;
          outline-offset: 3px;
        }

        .primary-btn:hover {
          background: #F0B156;
        }

        .primary-btn-active:hover {
          background: rgba(232, 163, 61, 0.08);
        }

        .secondary-btn:hover {
          border-color: rgba(241, 239, 231, 0.3);
          color: #F1EFE7;
        }

        .primary-btn:active,
        .primary-btn-active:active,
        .secondary-btn:active {
          transform: translateY(1px);
        }

        @media (max-width: 380px) {
          .stat-block {
            padding: 0 0.75rem !important;
          }
        }
      `}</style>

      {/* Faint topographic contour field */}
      <svg viewBox="0 0 400 500" style={styles.contours} aria-hidden="true">
        <path d="M-20 90 Q 100 40, 220 90 T 440 90" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.06" />
        <path d="M-20 140 Q 110 70, 230 140 T 440 140" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.05" />
        <path d="M-20 190 Q 90 130, 210 190 T 440 190" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.04" />
        <path d="M-20 370 Q 100 320, 220 370 T 440 370" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.04" />
        <path d="M-20 420 Q 110 460, 230 420 T 440 420" fill="none" stroke="#F1EFE7" strokeWidth="1" opacity="0.05" />
      </svg>

      <div style={styles.card}>

        {/* Status */}
        <div style={styles.statusRow}>
          <div style={styles.statusPill}>
            <span
              className="status-dot"
              style={{
                ...styles.statusDot,
                background: status === 'walking' ? '#E8A33D' : '#8FA396',
                animation: status === 'walking' ? 'driftDot 0.6s ease-in-out infinite' : 'none',
              }}
            />
            <span style={styles.statusText}>
              {STATUS_COPY[status] ?? status}
            </span>
          </div>
        </div>

        {/* Steps Number */}
        <div style={styles.numberWrap}>
          {status === 'walking' && (
            <span className="pulse-ring" style={styles.pulseRing} aria-hidden="true" />
          )}
          <h2 style={styles.stepNumber}>{steps.toLocaleString()}</h2>
        </div>
        <p style={styles.stepLabel}>steps</p>

        {/* Error */}
        {error && <p style={styles.errorText}>{error}</p>}

        {/* Stats */}
        <div style={styles.statsRow}>
          <div className="stat-block" style={styles.statBlock}>
            <span style={styles.statValue}>{km.toFixed(2)}</span>
            <span style={styles.statUnit}>km</span>
          </div>
          <div style={styles.statDivider} />
          {/* <div className="stat-block" style={styles.statBlock}>
            <span style={styles.statValue}>
              {geo.accuracy !== null ? `±${geo.accuracy.toFixed(0)}` : '—'}
            </span>
            <span style={styles.statUnit}>m accuracy</span>
          </div> */}
        </div>

        {/* Buttons */}
        <div style={styles.actions}>
          {!isTracking ? (
            <button
              className="primary-btn"
              style={styles.primaryBtn}
              onClick={() => {
                start();
                geo.start();
              }}
            >
              Start tracking
            </button>
          ) : (
            <button
              className="primary-btn-active"
              style={styles.primaryBtnActive}
              onClick={() => {
                stop();
                geo.stop();
              }}
            >
              Stop
            </button>
          )}

          <button
            className="secondary-btn"
            style={styles.secondaryBtn}
            onClick={() => {
              reset();
              geo.reset();
            }}
          >
            Reset
          </button>
        </div>

        {/* Map */}
        {isTracking && (
          <div style={styles.mapWrapper}>
            <WalkMap currentPosition={geo.currentPosition} path={geo.path} />
          </div>
        )}

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {

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
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2.75rem 1.75rem 2rem',
    background: 'rgba(241, 239, 231, 0.03)',
    border: '1px solid rgba(241, 239, 231, 0.08)',
    borderRadius: '28px',
    boxShadow: '0 24px 60px -20px rgba(0, 0, 0, 0.5)',
  },

  statusRow: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2.75rem',
  },

  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.55rem',
    padding: '0.4rem 0.9rem',
    borderRadius: 999,
    background: 'rgba(241, 239, 231, 0.06)',
    border: '1px solid rgba(241, 239, 231, 0.1)',
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
    marginBottom: '2rem',
  },

  errorText: {
    color: '#E8614A',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    maxWidth: 280,
  },

  statsRow: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    width: '100%',
    marginBottom: '2.25rem',
    paddingBottom: '2.25rem',
    borderBottom: '1px solid rgba(241, 239, 231, 0.08)',
  },

  statBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    flex: 1,
    padding: '0 1.25rem',
  },

  statDivider: {
    width: 1,
    background: 'rgba(241, 239, 231, 0.08)',
  },

  statValue: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontVariantNumeric: 'tabular-nums',
    fontSize: '1.4rem',
    fontWeight: 600,
    color: '#F1EFE7',
  },

  statUnit: {
    fontSize: '0.75rem',
    color: '#8FA396',
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
    transition: 'background 0.15s ease, transform 0.1s ease',
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
    transition: 'background 0.15s ease, transform 0.1s ease',
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
    transition: 'border-color 0.15s ease, color 0.15s ease, transform 0.1s ease',
  },

  mapWrapper: {
    width: '100%',
    marginTop: '1.5rem',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(241, 239, 231, 0.1)',
  },
};