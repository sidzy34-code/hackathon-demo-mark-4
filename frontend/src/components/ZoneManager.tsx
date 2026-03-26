import { useRef } from 'react';
import GlobeViewer, { GlobeRef } from './GlobeViewer';

const PARK_COORDS: Record<string, { lat: number; lon: number }> = {
    'nagarhole':   { lat: 11.9833, lon: 76.1167 },
    'corbett':     { lat: 29.5300, lon: 78.7747 },
    'kaziranga':   { lat: 26.5775, lon: 93.1711 },
    'sundarbans':  { lat: 21.9497, lon: 88.9468 },
    'maasai-mara': { lat: -1.4061, lon: 35.1019 },
    'kruger':      { lat: -23.9884, lon: 31.5547 },
};

export default function ZoneManager({ parkId }: { parkId: string }) {
  const center = PARK_COORDS[parkId] || PARK_COORDS['nagarhole'];
  const globeRef = useRef<GlobeRef>(null);

  const zones = [
    { id: 'z1', name: 'Alpha Core', latitude: center.lat + 0.05, longitude: center.lon - 0.05, radius: 5000, status: 'critical' as const, alerts: 2 },
    { id: 'z2', name: 'Beta Sector', latitude: center.lat - 0.03, longitude: center.lon + 0.02, radius: 6000, status: 'warning' as const, alerts: 1 },
    { id: 'z3', name: 'Gamma Ring', latitude: center.lat + 0.02, longitude: center.lon + 0.06, radius: 5500, status: 'normal' as const, alerts: 0 },
    { id: 'z4', name: 'Delta Post', latitude: center.lat - 0.04, longitude: center.lon - 0.03, radius: 7000, status: 'critical' as const, alerts: 3 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <GlobeViewer ref={globeRef} zones={zones} parkId={parkId} />
    </div>
  );
}