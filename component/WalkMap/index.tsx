'use client';

import {
  APIProvider,
  Map,
  AdvancedMarker,
  Polyline,
} from '@vis.gl/react-google-maps';

import type { LatLng } from '@/hooks/useGeoDistance';

interface WalkMapProps {
  currentPosition: LatLng | null;
  path: LatLng[];
}

export default function WalkMap({
  currentPosition,
  path,
}: WalkMapProps) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_JAVASCRIPT_API_KEY;

  // API key missing
  if (!apiKey) {
    return (
      <div
        style={{
          width: '100%',
          height: '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '1rem',
          background: '#1D2923',
          color: '#E8614A',
          borderRadius: '16px',
        }}
      >
        Google Maps API key सेट नाही.
        <br />
        `.env.local` check करा.
      </div>
    );
  }

  // GPS location अजून मिळाली नाही
  if (!currentPosition) {
    return (
      <div
        style={{
          width: '100%',
          height: '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '1rem',
          background: '#1D2923',
          color: '#8FA396',
          borderRadius: '16px',
        }}
      >
        📍 Location मिळण्याची वाट बघतोय...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <APIProvider apiKey={apiKey}>
        <Map
          center={currentPosition}
          defaultCenter={currentPosition}
          defaultZoom={17}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="DEMO_MAP_ID"
          style={styles.map}
        >

          {/* Current Location */}
          <AdvancedMarker
            position={currentPosition}
          />

          {/* Actual Walking Path */}
          {path.length > 1 && (
            <Polyline
              path={path}
              strokeColor="#E8A33D"
              strokeOpacity={0.9}
              strokeWeight={4}
            />
          )}

        </Map>
      </APIProvider>
    </div>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  container: {
    width: '100%',
    height: '350px',
    borderRadius: '16px',
    overflow: 'hidden',
  },

  map: {
    width: '100%',
    height: '100%',
  },
};