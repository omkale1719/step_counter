'use client';

import { useState, useRef, useCallback } from 'react';

interface UseGeoDistanceReturn {
  distanceMeters: number;
  isTracking: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000; // पृथ्वीची त्रिज्या (meters)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeoDistance(): UseGeoDistanceReturn {
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation या ब्राउझरमध्ये उपलब्ध नाही.');
      return;
    }
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // कमी accuracy (उदा. > 20m) असलेले points ignore करा — noisy असतात
        if (accuracy > 20) return;

        if (lastPosition.current) {
          const d = haversineDistance(
            lastPosition.current.lat,
            lastPosition.current.lon,
            latitude,
            longitude
          );
          // GPS jitter मुळे स्थिर उभं असतानाही 1-3m "movement" दिसू शकतं — छोटे jumps ignore करा
          if (d > 1.5) {
            setDistanceMeters((prev) => prev + d);
          }
        }
        lastPosition.current = { lat: latitude, lon: longitude };
      },
      (err) => setError('GPS error: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    setIsTracking(true);
  }, []);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  }, []);

  const reset = useCallback(() => {
    setDistanceMeters(0);
    lastPosition.current = null;
  }, []);

  return { distanceMeters, isTracking, error, start, stop, reset };
}