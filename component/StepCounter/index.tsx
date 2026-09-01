'use client';

import { useStepCounter } from "@/hooks/usestepcount";

export default function StepCounter() {
  const { steps, isTracking, error, status, start, stop, reset } =
    useStepCounter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "28px",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08)",
          textAlign: "center",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "25px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 14px",
              borderRadius: "20px",
              background: "#eef2ff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "30px",
            }}
          >
            👟
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "26px",
              fontWeight: "700",
              color: "#111827",
            }}
          >
            Step Counter
          </h1>

          <p
            style={{
              marginTop: "6px",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Track your daily walking activity
          </p>
        </div>

        {/* Steps Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            borderRadius: "24px",
            padding: "30px 20px",
            color: "#ffffff",
            marginBottom: "22px",
            boxShadow: "0 12px 30px rgba(79, 70, 229, 0.25)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              opacity: 0.85,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            Steps Taken
          </p>

          <h2
            style={{
              fontSize: "64px",
              lineHeight: 1,
              margin: "15px 0 10px",
              fontWeight: "800",
            }}
          >
            {steps}
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "15px",
              opacity: 0.9,
            }}
          >
            steps
          </p>
        </div>

        {/* Status */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginBottom: "22px",
          }}
        >
          <span
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: isTracking ? "#22c55e" : "#9ca3af",
              boxShadow: isTracking
                ? "0 0 0 5px rgba(34, 197, 94, 0.12)"
                : "none",
            }}
          />

          <span
            style={{
              color: "#4b5563",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {isTracking ? "Tracking Active" : "Tracking Stopped"}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              padding: "12px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              marginBottom: "18px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          {!isTracking ? (
            <button
              onClick={start}
              style={{
                flex: 1,
                border: "none",
                borderRadius: "14px",
                padding: "14px 20px",
                background: "#4f46e5",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(79, 70, 229, 0.2)",
              }}
            >
              ▶ Start Tracking
            </button>
          ) : (
            <button
              onClick={stop}
              style={{
                flex: 1,
                border: "none",
                borderRadius: "14px",
                padding: "14px 20px",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ■ Stop Tracking
            </button>
          )}

          <button
            onClick={reset}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "14px 18px",
              background: "#f9fafb",
              color: "#374151",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ↻
          </button>
        </div>

        {/* Status text */}
        <p
          style={{
            marginTop: "20px",
            marginBottom: 0,
            color: "#9ca3af",
            fontSize: "12px",
          }}
        >
          Sensor status: {status}
        </p>
      </div>
    </div>
  );
}