import React, { useEffect, useState } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { TomadorMarker, MotoMarker, DestinoMarker } from '../lib/mapIcons';
import { getRouteInfo } from '../lib/geoService';
import { UBTMap, GooglePolyline, MapFlyTo, isValidLatLng, UBATUBA_CENTER } from './UBTMap';

interface Props {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  prestadorLocation?: { lat: number; lng: number } | null;
  isPrestadorOnline?: boolean;
  showRoute?: boolean;
  onRouteInfo?: (distKm: number, durMin: number) => void;
  height?: string;
}

export function MototaxiMap({
  origin,
  destination,
  prestadorLocation,
  isPrestadorOnline = false,
  showRoute = false,
  onRouteInfo,
  height = '100svh',
}: Props) {
  const [polyline, setPolyline] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!showRoute || !origin || !destination) {
      setPolyline([]);
      return;
    }
    getRouteInfo(origin, destination).then((info) => {
      if (!info) return;
      setPolyline(info.polyline);
      onRouteInfo?.(info.distanceKm, info.durationMin);
    });
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, showRoute]);

  const center = origin && isValidLatLng(origin.lat, origin.lng)
    ? { lat: Number(origin.lat), lng: Number(origin.lng) }
    : UBATUBA_CENTER;

  return (
    <UBTMap center={center} zoom={15} style={{ width: '100%', height, zIndex: 0 }}>
      {origin && isValidLatLng(origin.lat, origin.lng) && (
        <AdvancedMarker position={{ lat: Number(origin.lat), lng: Number(origin.lng) }}>
          <TomadorMarker />
        </AdvancedMarker>
      )}
      {destination && isValidLatLng(destination.lat, destination.lng) && (
        <AdvancedMarker position={{ lat: Number(destination.lat), lng: Number(destination.lng) }}>
          <DestinoMarker />
        </AdvancedMarker>
      )}
      {prestadorLocation && isValidLatLng(prestadorLocation.lat, prestadorLocation.lng) && (
        <AdvancedMarker position={{ lat: Number(prestadorLocation.lat), lng: Number(prestadorLocation.lng) }}>
          <MotoMarker isOnline={isPrestadorOnline} />
        </AdvancedMarker>
      )}
      {polyline.length > 0 && <GooglePolyline path={polyline} color="#0DB87E" weight={4} />}
      {origin && isValidLatLng(origin.lat, origin.lng) && (
        <MapFlyTo center={{ lat: Number(origin.lat), lng: Number(origin.lng) }} zoom={15} />
      )}
    </UBTMap>
  );
}

export default MototaxiMap;
