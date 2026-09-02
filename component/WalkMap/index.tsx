'use client';

import {
  APIProvider,
  Map,
  Marker,
  Polyline,
} from '@vis.gl/react-google-maps';

import type { LatLng } from '@/hooks/useGeoDistance';

interface WalkMapProps {
  currentPosition: LatLng | null;
  path: LatLng[];
}

// तुमच्या app च्या forest-green / warm-orange theme शी जुळणारा dark map style
const DARK_FOREST_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#16211C' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#16211C' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8FA396' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#2A362F' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }], // गर्दी टाळण्यासाठी POI icons लपवले
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2A362F' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1D2923' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3A4A3F' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6B7D71' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0F1712' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4A5A50' }],
  },
];

export default function WalkMap({ currentPosition, path }: WalkMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_JAVASCRIPT_API_KEY;

  if (!apiKey) {
    return (
      <div style={styles.messageBox}>
        Google Maps API key सेट नाही.
        <br />
        `.env.local` check करा.
      </div>
    );
  }

  if (!currentPosition) {
    return (
      <div style={styles.messageBox}>
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
          disableDefaultUI={true}   // clean look — zoom/street-view बटणं काढली
          zoomControl={true}         // फक्त zoom control ठेवला
          styles={DARK_FOREST_MAP_STYLE} // ← custom dark theme (mapId नसल्यामुळे हे काम करेल)
          style={styles.map}
        >
          {/* Current location — custom orange dot, theme-matching */}
          <Marker
  position={currentPosition}
  icon={
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
        <circle cx="10" cy="10" r="8" fill="#E8A33D" stroke="#16211C" stroke-width="2"/>
      </svg>
    `)
  }
/>

          {/* Actual walking path */}
          {path.length > 1 && (
            <Polyline
              path={path}
              strokeColor="#E8A33D"
              strokeOpacity={0.85}
              strokeWeight={4}
            />
          )}
        </Map>
      </APIProvider>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '350px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(241, 239, 231, 0.1)', // तुमच्या mapWrapper style सारखं
  },
  map: {
    width: '100%',
    height: '100%',
  },
  messageBox: {
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
  },
};