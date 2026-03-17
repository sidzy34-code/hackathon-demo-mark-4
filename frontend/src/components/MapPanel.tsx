import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { PARKS } from '../lib/parksData';
import { useLiveAlerts } from '../lib/liveStream';

const createCustomIcon = (color: string, iconHtml: string, isPulse: boolean = false) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-8 h-8 rounded-full border-2 bg-black flex items-center justify-center ${isPulse ? 'animate-pulse-border' : ''}" style="border-color: ${color}; color: ${color}; box-shadow: ${isPulse ? '0 0 15px ' + color : 'none'};">
            ${iconHtml}
           </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
};

const Icons = {
    ACOUSTIC: createCustomIcon('#EF4444', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5v14M22 10v4M7 5v14M2 10v4"/></svg>'),
    CAMERA: createCustomIcon('#F59E0B', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>'),
    COMMUNITY: createCustomIcon('#3B82F6', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'),
    CORRELATED: createCustomIcon('#DC2626', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', true),
    ONE_HEALTH: createCustomIcon('#8B5CF6', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'),
};

const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 12, { animate: false });
    }, [center, map]);
    return null;
};

interface MapPanelProps {
    parkId?: string | null;
}

const MapPanel: React.FC<MapPanelProps> = ({ parkId }) => {
    const park = PARKS.find(p => p.id === parkId) || PARKS[0];
    const { alerts, predictiveState } = useLiveAlerts(parkId || PARKS[0].id);

    const center = park.centerCoordinates;
    const zones = park.zones;

    // Derive zone status dynamically from live alerts — same logic as ZoneStatus.tsx
    const zoneStatusMap: Record<string, string> = {};
    Array.from({ length: 8 }, (_, i) => `Z${i + 1}`).forEach(zoneId => {
        const zoneAlerts = alerts.filter(a => a.zone === zoneId);
        if (zoneAlerts.some(a => a.priority === 'CRITICAL' || a.priority === 'HIGH')) {
            zoneStatusMap[zoneId] = 'ACTIVE';
        } else if (zoneAlerts.length > 0) {
            zoneStatusMap[zoneId] = 'MONITORING';
        } else {
            zoneStatusMap[zoneId] = 'CLEAR';
        }
    });

    return (
        <div className="w-full h-full relative" id="map-container">
            <MapContainer
                center={center}
                zoom={10}
                style={{ height: '100%', width: '100%', background: '#0A0F1A' }}
                zoomControl={false}
            >
                <MapUpdater center={center} />

                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {Object.entries(zones).map(([zoneId, coords]) => {
                    const status = zoneStatusMap[zoneId] || 'CLEAR';
                    let color = '#059669'; // CLEAR
                    if (status === 'MONITORING') color = '#D97706';
                    if (status === 'ACTIVE') color = '#DC2626';

                    const isVulnerable = predictiveState?.recommendedPatrolZones.includes(zoneId);

                    return (
                        <div key={zoneId}>
                            <Polygon
                                positions={coords as [number, number][]}
                                pathOptions={{
                                    color: color,
                                    fillColor: color,
                                    fillOpacity: status === 'ACTIVE' ? 0.3 : 0.05,
                                    weight: status === 'ACTIVE' ? 2 : 1,
                                    dashArray: status === 'ACTIVE' ? '' : '5, 5'
                                }}
                            >
                                <Popup className="vanguard-popup">
                                    <div className="text-xs">
                                        <strong className="text-white block text-sm border-b border-gray-700 pb-1 mb-1">Zone {zoneId.replace('Z', '')}</strong>
                                        <span className="text-gray-400">Status: </span>
                                        <span style={{ color }}>{status}</span>
                                        {isVulnerable && <div className="mt-1 text-red-500 font-bold border-t border-gray-700 pt-1">PREDICTIVE THREAT DETECTED</div>}
                                    </div>
                                </Popup>
                            </Polygon>

                            {isVulnerable && (
                                <Polygon
                                    positions={coords as [number, number][]}
                                    pathOptions={{
                                        color: '#EF4444',
                                        fillColor: '#EF4444',
                                        fillOpacity: 0.15,
                                        weight: 2,
                                        dashArray: '10, 10',
                                        className: 'animate-pulse'
                                    }}
                                    interactive={false}
                                />
                            )}
                        </div>
                    );
                })}

                {alerts.map((alert) => (
                    <Marker
                        key={alert.id}
                        position={alert.location}
                        icon={Icons[alert.type as keyof typeof Icons]}
                    >
                        <Popup>
                            <div className="w-64">
                                <div className="flex justify-between items-start mb-2 border-b border-gray-700 pb-2">
                                    <span className="font-bold text-[13px]">{alert.subType.replace('_', ' ')}</span>
                                    <span className="font-mono text-xs text-gray-400">{alert.timestamp}</span>
                                </div>
                                <p className="text-gray-300 text-xs mb-2 leading-relaxed">{alert.description}</p>
                                <div className="flex justify-between text-xs text-gray-500 font-mono">
                                    <span>Zone: {alert.zone}</span>
                                    {alert.confidence && <span>Conf: {(alert.confidence * 100).toFixed(0)}%</span>}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <div className="absolute top-4 right-4 z-[400] bg-vanguard-panel/90 border border-vanguard-border backdrop-blur p-2 rounded text-xs flex flex-col gap-2 shadow-xl">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-vanguard-zoneClear"></div><span>Clear</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-vanguard-zoneMonitor"></div><span>Monitoring</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-vanguard-zoneActive"></div><span>Active Alert</span></div>
                {predictiveState && (
                    <div className="flex items-center gap-2 border-t border-gray-700 pt-2 mt-1">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse border border-red-300"></div>
                        <span className="text-red-400 font-bold">Predictive Threat ({(predictiveState.lunarIllumination * 100).toFixed(0)}% Moon)</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapPanel;
