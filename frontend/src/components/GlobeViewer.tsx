import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Ion,
  Viewer,
  Cartesian3,
  Color,
  HeightReference,
  Math as CesiumMath,
  ScreenSpaceEventType,
  CameraEventType,
  RequestScheduler,
  createWorldTerrainAsync,
  GeoJsonDataSource,
  ClassificationType,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Set Ion token at module level — enables World Imagery + World Terrain
Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ODU4OGE1YS00NTA2LTRmY2ItOWRmNS1hYTIyMTA5NGNkMjkiLCJpZCI6NDA5OTY1LCJpYXQiOjE3NzQ2MDAzMTd9.6KdayOutxoeStY5iTKrSzDtKy5JzUM2tt4B4hv5O68M';

// Max parallel tile requests per server — Cesium default is 6, raise to 18
// This is the single biggest lever for reducing tile pop-in delay
RequestScheduler.maximumRequestsPerServer = 18;

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

const PARK_COORDS: Record<string, { lat: number; lon: number; alt: number }> = {
  nagarhole:     { lat: 11.9833, lon: 76.1167, alt: 15_000_000 },
  corbett:       { lat: 29.5300, lon: 78.7747, alt: 15_000_000 },
  kaziranga:     { lat: 26.5775, lon: 93.1711, alt: 15_000_000 },
  sundarbans:    { lat: 21.9497, lon: 88.9468, alt: 15_000_000 },
  'maasai-mara': { lat: -1.4061, lon: 35.1019, alt: 15_000_000 },
  kruger:        { lat: -23.9884, lon: 31.5547, alt: 15_000_000 },
};

const ZONE_COLORS: Record<string, { fill: string; outline: string }> = {
  critical: { fill: 'rgba(255,51,102,0.18)',  outline: '#ff3366' },
  warning:  { fill: 'rgba(255,170,51,0.18)',  outline: '#ffaa33' },
  normal:   { fill: 'rgba(51,204,255,0.12)',  outline: '#33ccff' },
};

export const GlobeViewer = forwardRef<GlobeRef, GlobeViewerProps>(
  ({ parkId, zones = [] }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef    = useRef<Viewer | null>(null);
    const parkIdRef    = useRef(parkId);
    const zonesRef     = useRef(zones);

    // Keep refs in sync for use inside effects
    parkIdRef.current = parkId;
    zonesRef.current  = zones;

    // Expose flyTo to parent
    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lon: number) => {
        const v = viewerRef.current;
        if (!v || v.isDestroyed()) return;
        v.camera.flyTo({
          destination: Cartesian3.fromDegrees(lon, lat, 8000),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch:   CesiumMath.toRadians(-40),
            roll: 0,
          },
          duration: 2,
        });
      },
    }));

    // ─── Mount Cesium Viewer once ─────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current || viewerRef.current) return;

      const viewer = new Viewer(containerRef.current, {
        timeline:              false,
        animation:             false,
        homeButton:            false,
        sceneModePicker:       false,
        baseLayerPicker:       false,
        navigationHelpButton:  false,
        geocoder:              false,
        fullscreenButton:      false,
        infoBox:               false,
        selectionIndicator:    false,
      });

      viewerRef.current = viewer;

      // Google Earth-identical camera physics
      const MAX_ZOOM_OUT = 20_000_000; // 20,000km hard ceiling
      const ctrl = viewer.scene.screenSpaceCameraController;
      ctrl.inertiaSpin            = 0.93;  // long drag coast on release
      ctrl.inertiaTranslate       = 0.93;  // pan coast
      ctrl.inertiaZoom            = 0.8;   // snappy zoom deceleration
      ctrl.minimumZoomDistance    = 100;
      ctrl.maximumZoomDistance    = MAX_ZOOM_OUT;
      ctrl.enableCollisionDetection = false;
      ctrl.maximumMovementRatio   = 0.025; // ~4x less spin per pixel

      // Inertia zoom: accumulate velocity from wheel, decay with damping
      // This gives Google Earth's "coasting" feel after a fast scroll
      let zoomVelocity = 0;
      let zoomRafId: number | null = null;

      const animateZoom = () => {
        const v = viewerRef.current;
        if (!v || v.isDestroyed() || Math.abs(zoomVelocity) < 0.5) {
          zoomVelocity = 0;
          zoomRafId = null;
          return;
        }
        const height = v.camera.positionCartographic?.height ?? 1_000_000;
        const zoomAmount = height * 0.05 * Math.abs(zoomVelocity);
        if (zoomVelocity > 0) {
          v.camera.zoomIn(zoomAmount);
        } else {
          if (height < MAX_ZOOM_OUT) v.camera.zoomOut(zoomAmount);
        }
        zoomVelocity *= 0.82; // damping — higher = longer coast
        zoomRafId = requestAnimationFrame(animateZoom);
      };

      // Custom wheel: accumulate velocity then animate with inertia
      ctrl.zoomEventTypes = [CameraEventType.PINCH]; // keep pinch-zoom, disable default wheel
      viewer.screenSpaceEventHandler.setInputAction((wheelDelta: number) => {
        const v = viewerRef.current;
        if (!v || v.isDestroyed()) return;
        const height = v.camera.positionCartographic?.height ?? 1_000_000;
        // Block zoom-out when at max distance
        if (wheelDelta < 0 && height >= MAX_ZOOM_OUT) return;
        // Convert wheel delta to velocity units (normalise browser differences)
        zoomVelocity += Math.sign(wheelDelta) * Math.min(Math.abs(wheelDelta) / 100, 4);
        zoomVelocity = Math.max(-12, Math.min(12, zoomVelocity)); // clamp max speed
        if (!zoomRafId) zoomRafId = requestAnimationFrame(animateZoom);
      }, ScreenSpaceEventType.WHEEL);

      // Remove double-click zoom
      viewer.screenSpaceEventHandler.removeInputAction(
        ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      );

      // Uniform lighting — entire Earth lit equally, no day/night terminator
      viewer.scene.globe.enableLighting = false;
      if (viewer.scene.sun) viewer.scene.sun.show = false;
      if (viewer.scene.moon) viewer.scene.moon.show = false;
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;

      // ── Tile streaming performance (target <80ms pop-in) ──────────────────
      const globe = viewer.scene.globe;
      globe.maximumScreenSpaceError = 1.5;
      globe.tileCacheSize            = 1000;
      globe.preloadAncestors         = true;
      globe.preloadSiblings          = true;
      globe.loadingDescendantLimit   = 20;
      // ──────────────────────────────────────────────────────────────────────

      // Load Cesium World Terrain (real 3D elevation)
      createWorldTerrainAsync({ requestWaterMask: true, requestVertexNormals: true })
        .then(provider => {
          if (!viewer.isDestroyed()) viewer.terrainProvider = provider;
        })
        .catch(() => {/* fallback to ellipsoid if token ran out */});

      // Force Cesium canvas to fill the container correctly
      viewer.resize();

      // ResizeObserver — keeps canvas sized to parent on window/layout changes
      const resizeObserver = new ResizeObserver(() => {
        if (!viewer.isDestroyed()) viewer.resize();
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);

      // Fly to the initial park — full globe view, park facing screen
      const c = PARK_COORDS[parkIdRef.current] || PARK_COORDS['nagarhole'];
      setTimeout(() => {
        if (!viewer.isDestroyed()) {
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(c.lon, c.lat, c.alt),
            orientation: {
              heading: CesiumMath.toRadians(0),
              pitch:   CesiumMath.toRadians(-90), // straight down — globe faces you
              roll: 0,
            },
            duration: 2.5,
          });
        }
      }, 600);

      // Cleanup
      return () => {
        resizeObserver.disconnect();
        if (!viewer.isDestroyed()) viewer.destroy();
        viewerRef.current = null;
      };
    }, []); // Only runs once — Viewer is an imperative singleton

    // ─── Fly to park when parkId changes ─────────────────────────────────────
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      const c = PARK_COORDS[parkId] || PARK_COORDS['nagarhole'];
      setTimeout(() => {
        if (!viewer.isDestroyed()) {
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(c.lon, c.lat, c.alt),
            orientation: {
              heading: CesiumMath.toRadians(0),
              pitch:   CesiumMath.toRadians(-90),
              roll: 0,
            },
            duration: 2.5,
          });
        }
      }, 200);
    }, [parkId]);

    // ─── Sync zone entities whenever zones prop changes ───────────────────────
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      viewer.entities.removeAll();

      zones.forEach(zone => {
        const colors = ZONE_COLORS[zone.status] || ZONE_COLORS.normal;
        viewer.entities.add({
          name:     zone.name,
          position: Cartesian3.fromDegrees(zone.longitude, zone.latitude),
          ellipse: {
            semiMajorAxis:    zone.radius,
            semiMinorAxis:    zone.radius,
            material:         Color.fromCssColorString(colors.fill),
            outline:          true,
            outlineColor:     Color.fromCssColorString(colors.outline),
            outlineWidth:     2,
            heightReference:  HeightReference.CLAMP_TO_GROUND,
            classificationType: ClassificationType.TERRAIN,
          },
        });
      });
    }, [zones]);

    // ─── Load park boundary GeoJSON ───────────────────────────────────────────
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;

      fetch(`/api/earthengine/park-bounds/${parkId}`)
        .then(r => r.json())
        .then(data => {
          if (viewer.isDestroyed()) return null;
          return GeoJsonDataSource.load(data, {
            stroke:      Color.fromCssColorString('#00ffcc'),
            fill:        Color.TRANSPARENT,
            strokeWidth: 3,
          });
        })
        .then(ds => {
          if (ds && !viewer.isDestroyed()) {
            viewer.dataSources.removeAll();
            viewer.dataSources.add(ds);
          }
        })
        .catch(() => {});
    }, [parkId]);

    const handleReset = () => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;
      const c = PARK_COORDS[parkId] || PARK_COORDS['nagarhole'];
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(c.lon, c.lat, c.alt),
        orientation: {
          heading: CesiumMath.toRadians(0),
          pitch:   CesiumMath.toRadians(-90),
          roll: 0,
        },
        duration: 1.8,
      });
    };

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Cesium canvas */}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', background: '#0a0f1a' }}
        />

        {/* Reset view button — top-left overlay */}
        <button
          onClick={handleReset}
          title="Reset view"
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid rgba(0, 255, 200, 0.25)',
            background: 'rgba(10, 15, 26, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.2s, background 0.2s',
            outline: 'none',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 255, 200, 0.7)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 200, 0.1)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 255, 200, 0.25)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(10, 15, 26, 0.65)';
          }}
        >
          {/* Crosshair / home icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,255,200,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <circle cx="12" cy="12" r="2" fill="rgba(0,255,200,0.85)" />
          </svg>
        </button>
      </div>
    );
  }
);

export default GlobeViewer;