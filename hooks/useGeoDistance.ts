'use client';

import { useState, useRef, useCallback } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

interface UseGeoDistanceReturn {
  distanceMeters: number;
  isTracking: boolean;
  error: string | null;
  accuracy: number | null;
  currentPosition: LatLng | null; // ← नवीन: सध्याचं location
  path: LatLng[];                  // ← नवीन: आत्तापर्यंतचा संपूर्ण मार्ग
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MIN_MOVEMENT_METERS = 1.5;
const MAX_ACCEPTABLE_ACCURACY = 20;

export function useGeoDistance(): UseGeoDistanceReturn {
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null);
  const [path, setPath] = useState<LatLng[]>([]);

  const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('या ब्राउझरमध्ये Geolocation उपलब्ध नाही.');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        setAccuracy(acc);

        if (acc > MAX_ACCEPTABLE_ACCURACY) return;

        // Map वर live marker साठी current position नेहमी अपडेट करा
        // (distance calculation logic पेक्षा वेगळं — यासाठी jitter chalel)
        setCurrentPosition({ lat: latitude, lng: longitude });

        if (lastPosition.current) {
          const d = haversineDistance(
            lastPosition.current.lat,
            lastPosition.current.lon,
            latitude,
            longitude
          );
          if (d >= MIN_MOVEMENT_METERS) {
            setDistanceMeters((prev) => prev + d);
            setPath((prev) => [...prev, { lat: latitude, lng: longitude }]); // ← path मध्ये जोडा
            lastPosition.current = { lat: latitude, lon: longitude };
          }
        } else {
          lastPosition.current = { lat: latitude, lon: longitude };
          setPath([{ lat: latitude, lng: longitude }]); // ← पहिला point
        }
      },
      (err) => setError('GPS error: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    setIsTracking(true);
  }, []);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  }, []);

  const reset = useCallback(() => {
    setDistanceMeters(0);
    lastPosition.current = null;
    setAccuracy(null);
    setCurrentPosition(null);
    setPath([]);
  }, []);

  return {
    distanceMeters, isTracking, error, accuracy,
    currentPosition, path, start, stop, reset,
  };
}