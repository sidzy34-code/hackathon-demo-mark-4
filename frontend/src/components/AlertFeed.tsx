import React from 'react';
import { AlertTriangle, MapPin, Camera, Radio, ShieldAlert, Activity } from 'lucide-react';
import { PARKS } from '../lib/parksData';
import { useLiveAlerts } from '../lib/liveStream';

interface AlertFeedProps {
    parkId?: string | null;
}

const getIcon = (type: string) => {
    switch (type) {
        case 'ACOUSTIC': return <Radio size={16} className="text-red-500" />;
        case 'CAMERA': return <Camera size={16} className="text-amber-500" />;
        case 'COMMUNITY': return <MapPin size={16} className="text-blue-500" />;
        case 'CORRELATED': return <ShieldAlert size={16} className="text-red-600 animate-pulse" />;
        case 'ONE_HEALTH': return <Activity size={16} className="text-purple-500" />;
        default: return <AlertTriangle size={16} className="text-gray-500" />;
    }
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'CRITICAL': return 'bg-red-500/10 border-red-500/50 text-red-500';
        case 'HIGH': return 'bg-orange-500/10 border-orange-500/50 text-orange-500';
        case 'ELEVATED': return 'bg-amber-500/10 border-amber-500/50 text-amber-500';
        default: return 'bg-vanguard-bg border-vanguard-border text-gray-400';
    }
};

const AlertFeed: React.FC<AlertFeedProps> = ({ parkId }) => {
    const park = PARKS.find(p => p.id === parkId);
    const { alerts } = useLiveAlerts(parkId);
    if (!park) return null;

    return (
        <div className="h-full flex flex-col pt-2">
            <div className="px-5 pb-3 pt-1 border-b border-vanguard-border flex justify-between items-center bg-vanguard-panel">
                <h2 className="font-syne font-semibold tracking-wide text-sm text-gray-200">LIVE FEED</h2>
                <span className="text-xs font-mono text-vanguard-zoneActive bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 mr-2 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full animate-pulse bg-red-500" />{alerts.length} Active System Flags</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                {alerts.map(alert => (
                    <div key={alert.id} className={`p-3 rounded border text-sm flex gap-3 transition-colors hover:bg-vanguard-hover ${getPriorityColor(alert.priority)}`}>
                        <div className="mt-0.5">
                            {getIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold text-[13px] ${alert.priority === 'CRITICAL' ? 'text-red-400' : 'text-gray-200'}`}>{alert.subType.replace('_', ' ')}</span>
                                <span className="text-xs font-mono opacity-60">{alert.timestamp}</span>
                            </div>
                            <p className="text-gray-300 text-xs mb-2 leading-relaxed">{alert.description}</p>
                            <div className="flex items-center gap-3 text-[11px] font-mono opacity-70">
                                <span>ZONE {alert.zone.replace('Z', '')}</span>
                                {alert.confidence && <span>CONF: {(alert.confidence * 100).toFixed(0)}%</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertFeed;
