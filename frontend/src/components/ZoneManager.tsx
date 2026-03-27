import { useRef, useEffect, useState } from 'react';
import GlobeViewer, { GlobeRef } from './GlobeViewer';

interface Zone {
  id: string;
  _id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: 'critical' | 'warning' | 'normal';
  alerts: number;
}

export default function ZoneManager({ parkId }: { parkId: string }) {
  const globeRef = useRef<GlobeRef>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch zones from MongoDB via API — auto-seeds if empty
  useEffect(() => {
    setLoading(true);
    fetch(`/api/zones/${parkId}`)
      .then(r => r.json())
      .then(data => {
        // Normalize MongoDB _id to id
        const normalized = Array.isArray(data)
          ? data.map(z => ({ ...z, id: z._id || z.id }))
          : [];
        setZones(normalized);
      })
      .catch(() => setZones([]))
      .finally(() => setLoading(false));
  }, [parkId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {!loading && (
        <GlobeViewer ref={globeRef} zones={zones} parkId={parkId} />
      )}
    </div>
  );
}