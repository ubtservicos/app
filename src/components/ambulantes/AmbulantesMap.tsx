import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { getCategoriaIcon, type AmbulanteSession } from '@/mocks/ambulantesSessions';
import { TomadorMarker, AmbulanteMarker } from '@/lib/mapIcons';
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
      <AdvancedMarker position={mapCenter}>
        <TomadorMarker />
      </AdvancedMarker>
      {sessions.map((s) => {
        if (!s?.location || !isValidLatLng(s.location.lat, s.location.lng)) return null;
        const cat = getCategoriaIcon(s.produtos);
        return (
          <AdvancedMarker
            key={s.sessionId}
            position={{ lat: Number(s.location.lat), lng: Number(s.location.lng) }}
            onClick={() => onMarkerClick?.(s)}
          >
            <AmbulanteMarker categoria={cat} />
          </AdvancedMarker>
        );
      })}
    </UBTMap>
  );
};

export default AmbulantesMap;
