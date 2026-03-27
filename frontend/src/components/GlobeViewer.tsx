import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Ion,
  Cartesian3,
  Color,
  createWorldTerrainAsync,
  HeightReference,
  Math as CesiumMath,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
} from 'cesium';
import { Viewer, Entity, GeoJsonDataSource } from 'resium';
import type { CesiumComponentRef } from 'resium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Set Ion token — enables Cesium World Imagery + Terrain
Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ODU4OGE1YS00NTA2LTRmY2ItOWRmNS1hYTIyMTA5NGNkMjkiLCJpZCI6NDA5OTY1LCJpYXQiOjE3NzQ2MDAzMTd9.6KdayOutxoeStY5iTKrSzDtKy5JzUM2tt4B4hv5O68M';

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
  nagarhole:   { lat: 11.9833, lon: 76.1167, alt: 45000 },
  corbett:     { lat: 29.5300, lon: 78.7747, alt: 55000 },
  kaziranga:   { lat: 26.5775, lon: 93.1711, alt: 45000 },
  sundarbans:  { lat: 21.9497, lon: 88.9468, alt: 60000 },
  'maasai-mara': { lat: -1.4061, lon: 35.1019, alt: 70000 },
  kruger:      { lat: -23.9884, lon: 31.5547, alt: 80000 },
};

const ZONE_COLORS: Record<string, { fill: string; outline: string }> = {
  critical: { fill: 'rgba(255,51,102,0.18)',  outline: '#ff3366' },
  warning:  { fill: 'rgba(255,170,51,0.18)',  outline: '#ffaa33' },
  normal:   { fill: 'rgba(51,204,255,0.12)',  outline: '#33ccff' },
};

export const GlobeViewer = forwardRef<GlobeRef, GlobeViewerProps>(
  ({ parkId, zones = [] }, ref) => {
    const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
    const [terrainProvider, setTerrainProvider] = useState<any>(undefined);
    const [parkBorders, setParkBorders] = useState<any>(null);
    const configured = useRef(false);

    // Load Cesium World Terrain (real 3D elevation — mountains, valleys)
    useEffect(() => {
      createWorldTerrainAsync({ requestWaterMask: true, requestVertexNormals: true })
        .then(setTerrainProvider)
        .catch(() => {}); // Fallback to ellipsoid if Ion limit hit
    }, []);

    // Fetch park boundary GeoJSON
    useEffect(() => {
      fetch(`/api/earthengine/park-bounds/${parkId}`)
        .then((r) => r.json())
        .then(setParkBorders)
        .catch(() => {});
    }, [parkId]);

    // Configure camera physics (Google Earth inertia) once on mount
    useEffect(() => {
      const interval = setInterval(() => {
        const cesium = viewerRef.current?.cesiumElement;
        if (!cesium || configured.current) return;

        const ctrl = cesium.scene.screenSpaceCameraController;
        // Google Earth-identical inertia settings
        ctrl.inertiaSpin      = 0.9;
        ctrl.inertiaTranslate = 0.9;
        ctrl.inertiaZoom      = 0.9;
        ctrl.minimumZoomDistance = 150;  // 150m from ground max zoom-in
        ctrl.maximumZoomDistance = 20000000; // 20,000km zoom-out

        // Remove default double-click zoom-to behavior (interferes with click handlers)
        cesium.screenSpaceEventHandler.removeInputAction(
          ScreenSpaceEventType.LEFT_DOUBLE_CLICK
        );

        // Enable lighting for realism
        cesium.scene.globe.enableLighting = true;

        // Premium atmosphere
        if (cesium.scene.skyAtmosphere) cesium.scene.skyAtmosphere.show = true;

        // Fly to the current park
        const c = PARK_COORDS[parkId] || PARK_COORDS['nagarhole'];
        cesium.camera.flyTo({
          destination: Cartesian3.fromDegrees(c.lon, c.lat, c.alt),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch:   CesiumMath.toRadians(-45), // 45° tilt for Google Earth feel
            roll: 0,
          },
          duration: 2.5,
        });

        configured.current = true;
        clearInterval(interval);
      }, 200);

      return () => clearInterval(interval);
    }, [parkId]);

    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lon: number) => {
        viewerRef.current?.cesiumElement?.camera.flyTo({
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

    return (
      <div style={{ width: '100%', height: '100%', background: '#0a0f1a' }}>
        <Viewer
          ref={viewerRef}
          style={{ width: '100%', height: '100%' }}
          terrainProvider={terrainProvider}
          // Strip all default Cesium UI chrome
          timeline={false}
          animation={false}
          homeButton={false}
          sceneModePicker={false}
          baseLayerPicker={false}
          navigationHelpButton={false}
          geocoder={false}
          fullscreenButton={false}
          infoBox={false}
          selectionIndicator={false}
          creditContainer={document.createElement('div')} // hide credit banner
        >
          {/* Zone circles — hardware-accelerated ellipses clamped to terrain */}
          {zones.map((zone) => {
            const colors = ZONE_COLORS[zone.status] || ZONE_COLORS.normal;
            return (
              <Entity
                key={zone.id}
                name={zone.name}
                position={Cartesian3.fromDegrees(zone.longitude, zone.latitude)}
                ellipse={{
                  semiMajorAxis: zone.radius,
                  semiMinorAxis: zone.radius,
                  material: Color.fromCssColorString(colors.fill),
                  outline: true,
                  outlineColor: Color.fromCssColorString(colors.outline),
                  outlineWidth: 2,
                  heightReference: HeightReference.CLAMP_TO_GROUND,
                  classificationType: 0, // TERRAIN — clamps to 3D terrain surface
                }}
              />
            );
          })}

          {/* Park boundary GeoJSON — cyan outline */}
          {parkBorders && (
            <GeoJsonDataSource
              data={parkBorders}
              stroke={Color.fromCssColorString('#00ffcc')}
              fill={Color.TRANSPARENT}
              strokeWidth={3}
            />
          )}
        </Viewer>
      </div>
    );
  }
);

export default GlobeViewer;