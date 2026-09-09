import React, { useEffect, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import {
  GOOGLE_MAPS_API_KEY,
  UBATUBA_CENTER,
  UBATUBA_BOUNDS,
  isValidLatLng,
  GOOGLE_MAPS_DARK_STYLE,
} from '@/lib/googleMapsConfig';

export {
  GOOGLE_MAPS_API_KEY,
  UBATUBA_CENTER,
  UBATUBA_BOUNDS,
  isValidLatLng,
  GOOGLE_MAPS_DARK_STYLE,
};

// Componente para desenhar Polyline no Google Map
export function GooglePolyline({
  path,
  color = '#0DB87E',
  weight = 4,
  opacity = 0.9,
}: {
  path: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map,
        strokeColor: color,
        strokeWeight: weight,
        strokeOpacity: opacity,
      });
    } else {
      polylineRef.current.setMap(map);
      polylineRef.current.setOptions({ strokeColor: color, strokeWeight: weight, strokeOpacity: opacity });
    }

    const latLngPath = path
      .filter(([lat, lng]) => isValidLatLng(lat, lng))
      .map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));

    polylineRef.current.setPath(latLngPath);

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, path, color, weight, opacity]);

  return null;
}

// Componente para mover a câmera suavemente (FlyTo)
export function MapFlyTo({ center, zoom = 15 }: { center: { lat: number; lng: number } | [number, number]; zoom?: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const lat = Array.isArray(center) ? center[0] : center.lat;
    const lng = Array.isArray(center) ? center[1] : center.lng;
    if (isValidLatLng(lat, lng)) {
      map.panTo({ lat: Number(lat), lng: Number(lng) });
      if (zoom) map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  return null;
}

// Componente para capturar clique no mapa
export function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onClick]);

  return null;
}

interface UBTMapProps {
  center?: { lat: number; lng: number } | [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  dark?: boolean;
  mapId?: string;
  onClick?: (lat: number, lng: number) => void;
  gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
}

export function UBTMap({
  center = UBATUBA_CENTER,
  zoom = 14,
  style = { width: '100%', height: '400px' },
  children,
  dark = true,
  mapId = 'ubt_dark_map',
  onClick,
  gestureHandling = 'greedy',
}: UBTMapProps) {
  const defaultCenter = Array.isArray(center)
    ? { lat: Number(center[0]), lng: Number(center[1]) }
    : { lat: Number(center.lat), lng: Number(center.lng) };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'routes', 'geometry', 'marker']}>
      <GoogleMap
        mapId={mapId}
        defaultCenter={defaultCenter}
        defaultZoom={zoom}
        style={style}
        styles={dark ? GOOGLE_MAPS_DARK_STYLE : undefined}
        disableDefaultUI={true}
        gestureHandling={gestureHandling}
        restriction={{
          latLngBounds: UBATUBA_BOUNDS,
          strictBounds: false,
        }}
      >
        {onClick && <MapClickHandler onClick={onClick} />}
        {children}
      </GoogleMap>
    </APIProvider>
  );
}

export { AdvancedMarker };
export default UBTMap;
