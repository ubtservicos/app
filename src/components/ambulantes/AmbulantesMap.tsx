import React from 'react';
import { Marker } from '@vis.gl/react-google-maps';
import { getCategoriaIcon, type AmbulanteSession } from '@/mocks/ambulantesSessions';
import { tomadorIcon } from '@/lib/mapIcons';
import { UBTMap, isValidLatLng, UBATUBA_CENTER } from '@/components/UBTMap';

interface Props {
  center: { lat: number; lng: number };
  sessions: AmbulanteSession[];
  onMarkerClick?: (s: AmbulanteSession) => void;
  selectedId?: string | null;
  height?: string;
}

const AmbulantesMap = ({ center, sessions, onMarkerClick, height = '100%' }: Props) => {
  const mapCenter = center && isValidLatLng(center.lat, center.lng)
    ? { lat: Number(center.lat), lng: Number(center.lng) }
    : UBATUBA_CENTER;

  return (
    <UBTMap center={mapCenter} zoom={15} style={{ width: '100%', height }}>
      <Marker position={mapCenter} icon={tomadorIcon} />
      {sessions.map((s) => {
        if (!s?.location || !isValidLatLng(s.location.lat, s.location.lng)) return null;
        const cat = getCategoriaIcon(s.produtos);
        return (
          <Marker
            key={s.sessionId}
            position={{ lat: Number(s.location.lat), lng: Number(s.location.lng) }}
            onClick={() => onMarkerClick?.(s)}
          />
        );
      })}
    </UBTMap>
  );
};

export default AmbulantesMap;
