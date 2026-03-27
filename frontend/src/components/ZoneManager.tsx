import { useRef, useEffect, useState, lazy, Suspense } from 'react';

// Dynamically import GlobeViewer to code-split Cesium and avoid 2500+ dev network requests
const GlobeViewer = lazy(() => import('./GlobeViewer'));

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
// Use any for ref type to simplify lazy typing, or we could extract GlobeRef
export default function ZoneManager({ parkId }: { parkId: string }) {
  const globeRef = useRef<any>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Defer rendering until DOM is fully painted
  useEffect(() => {
    setMounted(true);
  }, []);

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
      {mounted && !loading && (
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-[#0a0f1a] text-vanguard-camera text-sm tracking-widest font-mono">
            INITIALIZING CESIUM ENGINE...
          </div>
        }>
          <GlobeViewer ref={globeRef} zones={zones} parkId={parkId} />
        </Suspense>
      )}
    </div>
  );
}