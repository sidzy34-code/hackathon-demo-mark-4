import React, { useEffect, useState } from 'react';
import { AlertCircle, Activity, Satellite, Users } from 'lucide-react';
import { PARKS } from '../lib/parksData';
import { useLiveAlerts, EnvironmentData } from '../lib/liveStream';

interface QuickStatsProps {
    parkId?: string | null;
}

const QuickStats: React.FC<QuickStatsProps> = ({ parkId }) => {
    const park = PARKS.find(p => p.id === parkId);
    const { alerts, predictiveState, environmentData: liveEnv } = useLiveAlerts(parkId);
    const [localEnv, setLocalEnv] = useState<EnvironmentData | null>(null);
    const [eonetCount, setEonetCount] = useState<number | null>(null);
    const [gbifCount, setGbifCount] = useState<number | null>(null);

    // Fetch environment once on mount if we don't have SSE data yet
    useEffect(() => {
        if (!park) return;
        const [lat, lon] = park.centerCoordinates;
        
        if (!liveEnv) {
            fetch(`/api/environment/${lat}/${lon}`)
                .then(r => r.json())
                .then(data => setLocalEnv(data))
                .catch(() => {});
        }

        fetch(`/api/eonet/${lat}/${lon}`)
            .then(r => r.json())
            .then(data => setEonetCount(data.total))
            .catch(() => {});

        fetch(`/api/gbif/${lat}/${lon}`)
            .then(r => r.json())
            .then(data => setGbifCount(data.total))
            .catch(() => {});
    }, [parkId]);

    if (!park) return null;

    const env = liveEnv || localEnv;
    const criticalAlerts = alerts.filter(a => a.priority === 'CRITICAL' || a.priority === 'HIGH').length;

    // Prefer real environment data for threatMultiplier, fall back to predictiveState
    const threatMultiplier = env?.threatMultiplier ?? predictiveState?.threatMultiplier;
    const lunarIllumination = env?.lunarIllumination ?? predictiveState?.lunarIllumination;

    const stats = [
        {
            label: 'CRITICAL FLAGS',
            value: criticalAlerts,
            icon: AlertCircle,
            color: 'text-vanguard-critical',
            border: 'border-vanguard-critical/30',
            bg: 'bg-vanguard-critical/10'
        },
        {
            label: 'THREAT MATRIX',
            value: threatMultiplier ? `${threatMultiplier.toFixed(1)}x` : '...',
            subtitle: lunarIllumination != null
                ? `${(lunarIllumination * 100).toFixed(0)}% LUNAR ILLUM`
                : env ? 'LIVE DATA' : 'ANALYZING',
            icon: Activity,
            color: threatMultiplier && threatMultiplier >= 1.8 ? 'text-red-400'
                 : threatMultiplier && threatMultiplier >= 1.4 ? 'text-orange-400'
                 : 'text-vanguard-elevated',
            border: 'border-vanguard-elevated/30',
            bg: 'bg-vanguard-elevated/10'
        },
        {
            label: 'SATELLITE EVENTS',
            value: eonetCount !== null ? eonetCount : '—',
            subtitle: 'NASA EONET',
            icon: Satellite,
            color: 'text-vanguard-species',
            border: 'border-vanguard-species/30',
            bg: 'bg-vanguard-species/10'
        },
        {
            label: 'BIODIVERSITY',
            value: gbifCount !== null ? gbifCount : '—',
            subtitle: 'GBIF OBSERVATIONS',
            icon: Users,
            color: 'text-vanguard-camera',
            border: 'border-vanguard-camera/30',
            bg: 'bg-vanguard-camera/10'
        },
    ];

    return (
        <div className="h-full flex flex-col p-3">
            <h3 className="text-[10px] font-semibold text-gray-500 mb-2 tracking-widest uppercase">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-2 flex-1">
                {stats.map((stat, idx) => (
                    <div key={idx} className={`bg-vanguard-panel border ${stat.border} rounded p-2.5 flex flex-col justify-between`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-semibold text-gray-400">{stat.label}</span>
                            <div className={`p-1 rounded ${stat.bg}`}>
                                <stat.icon className={`w-3 h-3 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className={`text-2xl font-mono font-bold ${stat.color}`}>
                                {stat.value}
                            </span>
                            {stat.subtitle && (
                                <span className="text-[9px] font-mono opacity-60 leading-tight">
                                    {stat.subtitle}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuickStats;
