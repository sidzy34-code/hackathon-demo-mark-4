import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';

interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: 'critical' | 'warning' | 'normal';
  alerts: number;
}

export interface GlobeRef {
  flyTo: (lat: number, lon: number) => void;
}

interface GlobeViewerProps {
  parkId: string;
  zones?: Zone[];
  alerts?: any[];
  onZoneClick?: (zone: Zone) => void;
}

// ESRI World Imagery — free, unlimited, up to zoom 19 (sub-meter resolution)
const TILE_URL = (x: number, y: number, l: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;

// Stable callback refs — prevents re-renders that destroy WebGL context
const TRANSPARENT = () => 'rgba(0,0,0,0)';
const BORDER_COLOR = () => '#00ffcc';

const PARK_COORDS: Record<string, { lat: number; lon: number }> = {
  'nagarhole':   { lat: 11.9833, lon: 76.1167 },
  'corbett':     { lat: 29.5300, lon: 78.7747 },
  'kaziranga':   { lat: 26.5775, lon: 93.1711 },
  'sundarbans':  { lat: 21.9497, lon: 88.9468 },
  'maasai-mara': { lat: -1.4061, lon: 35.1019 },
  'kruger':      { lat: -23.9884, lon: 31.5547 },
};

export const GlobeViewer = forwardRef<GlobeRef, GlobeViewerProps>(({ parkId, zones = [] }, ref) => {
  const container = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods>();
  const controlsConfigured = useRef(false);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [parkBorders, setParkBorders] = useState<any[]>([]);

  // Zone rings — stable data
  const zoneRings = zones.map(zone => ({
    lat: zone.latitude,
    lng: zone.longitude,
    maxR: (zone.radius / 111320) * 1.5,
    propagationSpeed: 2,
    repeatPeriod: 800,
    color: zone.status === 'critical' ? () => 'rgba(255, 51, 102, 0.9)'
         : zone.status === 'warning' ? () => 'rgba(255, 170, 51, 0.9)'
         : () => 'rgba(51, 204, 255, 0.9)'
  }));

  // Stable ring accessors
  const ringColor = useCallback((d: any) => d.color, []);
  const ringMaxR  = useCallback((d: any) => d.maxR, []);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lon: number) => {
      globeRef.current?.pointOfView({ lat, lng: lon, altitude: 0.12 }, 1500);
    }
  }));

  // Fetch Park Boundary GeoJSON
  useEffect(() => {
    fetch(`/api/earthengine/park-bounds/${parkId}`)
      .then(r => r.json())
      .then(data => { if (data?.features) setParkBorders(data.features); })
      .catch(() => {});
  }, [parkId]);

  // ResizeObserver
  useEffect(() => {
    if (!container.current) return;
    const el = container.current;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Configure controls + renderer quality once
  useEffect(() => {
    if (!globeRef.current || controlsConfigured.current) return;
    
    // OrbitControls — premium heavy feel
    const controls = globeRef.current.controls() as any;
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.4;
      controls.zoomSpeed = 0.8;
      controls.autoRotate = false;
      controls.enablePan = false;
    }

    // Renderer — max quality
    const renderer = globeRef.current.renderer() as any;
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    controlsConfigured.current = true;
  });

  // Fly to park on mount
  useEffect(() => {
    if (!globeRef.current) return;
    const c = PARK_COORDS[parkId] || PARK_COORDS['nagarhole'];
    const timer = setTimeout(() => {
      globeRef.current?.pointOfView({ lat: c.lat, lng: c.lon, altitude: 0.25 }, 2000);
    }, 600);
    return () => clearTimeout(timer);
  }, [parkId]);

  return (
    <div ref={container} style={{ width: '100%', height: '100%', background: '#010118', cursor: 'grab' }}>
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          animateIn={false}
          
          // TILE ENGINE — the core of Google Earth-like zooming
          // globeTileEngineUrl replaces globeImageUrl when set
          // globeTileEngineMaxLevel controls how deep the tiles go (default ~5, we push to 18 for sub-meter ESRI)
          globeTileEngineUrl={TILE_URL}
          //@ts-ignore — prop exists at runtime but missing from older type defs
          globeTileEngineMaxLevel={18}
          //@ts-ignore
          globeCurvatureResolution={64}
          
          // Premium atmosphere glow
          showAtmosphere={true}
          atmosphereColor="#3a86ff"
          atmosphereAltitude={0.15}
          
          // Starfield background  
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          
          // Park Borders — cyan outlines
          polygonsData={parkBorders}
          polygonCapColor={TRANSPARENT}
          polygonSideColor={TRANSPARENT}
          polygonStrokeColor={BORDER_COLOR}
          
          // Zone rings — animated pulses
          ringsData={zoneRings}
          ringColor={ringColor}
          ringMaxRadius={ringMaxR}
          ringPropagationSpeed={2}
          ringRepeatPeriod={800}
        />
      )}
    </div>
  );
});

export default GlobeViewer;