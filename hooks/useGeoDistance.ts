'use client';

import { useState, useRef, useCallback } from 'react';

interface UseGeoDistanceReturn {
  distanceMeters: number;
  isTracking: boolean;
  error: string | null;
  accuracy: number | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

// Haversine formula — दोन lat/lon points मधलं जमिनीवरचं सरळ अंतर (meters)
function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000; // पृथ्वीची त्रिज्या
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GPS मध्ये स्थिर उभं असतानाही थोडा jitter (1-3m) दिसतो —
// इतक्या लहान movements ला "प्रत्यक्ष चालणं" मानायचं नाही.
const MIN_MOVEMENT_METERS = 1.5;

// Accuracy बरोबर नसलेले (उदा. > 20m radius) points विश्वासार्ह नसतात, वगळा.
const MAX_ACCEPTABLE_ACCURACY = 20;

export function useGeoDistance(): UseGeoDistanceReturn {
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

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

        if (acc > MAX_ACCEPTABLE_ACCURACY) {
          // हा reading खूप noisy आहे, distance मध्ये मोजू नका
          return;
        }

        if (lastPosition.current) {
          const d = haversineDistance(
            lastPosition.current.lat,
            lastPosition.current.lon,
            latitude,
            longitude
          );
          if (d >= MIN_MOVEMENT_METERS) {
            setDistanceMeters((prev) => prev + d);
            lastPosition.current = { lat: latitude, lon: longitude };
          }
          // d खूप लहान असेल तर lastPosition अपडेट करू नका —
          // छोटे jitter accumulate होऊन चुकीचं अंतर वाढू नये म्हणून.
        } else {
          lastPosition.current = { lat: latitude, lon: longitude };
        }
      },
      (err) => setError('GPS error: ' + err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
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
  }, []);

  return { distanceMeters, isTracking, error, accuracy, start, stop, reset };
}