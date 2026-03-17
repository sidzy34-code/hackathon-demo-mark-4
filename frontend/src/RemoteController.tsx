import React, { useState, useEffect } from 'react';
import { Zap, Activity, ShieldAlert, Users, Trash2, Smartphone, MapPin, CheckCircle2, Scissors, Truck, Biohazard, Eye, ListX, ChevronDown, ChevronUp, Radio, Camera } from 'lucide-react';
import { PARKS } from './lib/parksData';

interface LiveAlert {
    id: string;
    parkId: string;
    zone: string;
    type: string;
    subType: string;
    description: string;
    timestamp: string;
    confidence?: number;
    severity?: string;
}

const RemoteController: React.FC = () => {
    const [selectedPark, setSelectedPark] = useState(PARKS[0].id);
    const [selectedZone, setSelectedZone] = useState('Z3');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
    const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
    const [selectivePurgeOpen, setSelectivePurgeOpen] = useState(false);
    const [loadingAlerts, setLoadingAlerts] = useState(false);

    const triggerHaptic = (pattern: number | number[] = 50) => {
        if ('vibrate' in navigator) navigator.vibrate(pattern);
    };

    const triggerWebhook = async (endpoint: string, payload: any) => {
        triggerHaptic(60);
        setStatus({ type: null, message: '' });
        try {
            const response = await fetch(`/api/webhooks/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setStatus({ type: 'success', message: `${endpoint.toUpperCase()} TRANSMITTED` });
                setTimeout(() => setStatus({ type: null, message: '' }), 2000);
            } else {
                setStatus({ type: 'error', message: 'TRANSMISSION FAILED' });
            }
        } catch {
            setStatus({ type: 'error', message: 'OFFLINE / SERVER ERROR' });
        }
    };

    // Fetch live alerts from backend filtered by selected park
    const fetchAlerts = async () => {
        setLoadingAlerts(true);
        try {
            const res = await fetch(`/api/alerts?parkId=${selectedPark}`);
            const data = await res.json();
            setLiveAlerts(data.alerts || []);
            setSelectedAlertIds(new Set());
        } catch {
            setLiveAlerts([]);
        } finally {
            setLoadingAlerts(false);
        }
    };

    // Refresh alerts when selective purge panel opens or park changes
    useEffect(() => {
        if (selectivePurgeOpen) fetchAlerts();
    }, [selectivePurgeOpen, selectedPark]);

    const toggleAlertSelection = (id: string) => {
        setSelectedAlertIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedAlertIds.size === liveAlerts.length) {
            setSelectedAlertIds(new Set());
        } else {
            setSelectedAlertIds(new Set(liveAlerts.map(a => a.id)));
        }
    };

    const purgeSelected = async () => {
        if (selectedAlertIds.size === 0) return;
        triggerHaptic([40, 60, 40]);
        setStatus({ type: null, message: '' });
        try {
            const res = await fetch('/api/webhooks/purge-selected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedAlertIds), parkId: selectedPark })
            });
            if (res.ok) {
                setStatus({ type: 'success', message: `${selectedAlertIds.size} ALERT(S) PURGED` });
                setTimeout(() => setStatus({ type: null, message: '' }), 2000);
                fetchAlerts();
            } else {
                setStatus({ type: 'error', message: 'PURGE FAILED' });
            }
        } catch {
            setStatus({ type: 'error', message: 'OFFLINE / SERVER ERROR' });
        }
    };

    const getAlertTypeIcon = (type: string) => {
        switch (type) {
            case 'ACOUSTIC': return <Radio size={12} className="text-red-400" />;
            case 'CAMERA':   return <Camera size={12} className="text-amber-400" />;
            case 'COMMUNITY': return <Users size={12} className="text-blue-400" />;
            default:          return <ShieldAlert size={12} className="text-gray-400" />;
        }
    };

    const getAlertBorderColor = (type: string) => {
        switch (type) {
            case 'ACOUSTIC':  return 'border-red-500/30';
            case 'CAMERA':    return 'border-amber-500/30';
            case 'COMMUNITY': return 'border-blue-500/30';
            default:          return 'border-white/10';
        }
    };

    const park = PARKS.find(p => p.id === selectedPark);
    const zones = park ? Object.keys(park.zones) : ['Z1','Z2','Z3','Z4','Z5','Z6','Z7','Z8'];

    const acousticButtons = [
        { label: 'GUNSHOT',  color: 'red',    icon: <Zap size={22} />,      payload: { parkId: selectedPark, zone: selectedZone, type: 'ACOUSTIC', subType: 'GUNSHOT',        confidence: 0.95, description: 'High-caliber rifle discharge detected in sector.' } },
        { label: 'CHAINSAW', color: 'orange', icon: <Scissors size={22} />, payload: { parkId: selectedPark, zone: selectedZone, type: 'ACOUSTIC', subType: 'CHAINSAW',       confidence: 0.92, description: 'Motorized cutting signature — possible illegal logging.' } },
        { label: 'VEHICLE',  color: 'orange', icon: <Truck size={22} />,    payload: { parkId: selectedPark, zone: selectedZone, type: 'ACOUSTIC', subType: 'VEHICLE_ENGINE', confidence: 0.87, description: 'Unscheduled vehicle engine detected in restricted zone.' } },
    ];

    const visionButtons = [
        { label: 'HUMAN',   color: 'amber', icon: <ShieldAlert size={22} />, payload: { parkId: selectedPark, zone: selectedZone, type: 'CAMERA', subType: 'HUMAN_PRESENCE',    confidence: 0.88, description: 'Unauthorized individual detected by camera trap.' } },
        { label: 'VEHICLE', color: 'amber', icon: <MapPin size={22} />,      payload: { parkId: selectedPark, zone: selectedZone, type: 'CAMERA', subType: 'VEHICLE_DETECTED',  confidence: 0.85, description: 'Suspicious motor vehicle detected on camera.' } },
        { label: 'ANOMALY', color: 'amber', icon: <Eye size={22} />,         payload: { parkId: selectedPark, zone: selectedZone, type: 'CAMERA', subType: 'BEHAVIORAL_ANOMALY',confidence: 0.82, description: 'Unusual animal behavioral pattern — possible stress or injury.' } },
    ];

    const communityButtons = [
        { label: 'SNARE LINE',  color: 'teal', icon: <Users size={22} />,       payload: { parkId: selectedPark, zone: selectedZone, type: 'COMMUNITY', subType: 'SNARE_DETECTED', description: 'Active wire snare line reported by community member.' } },
        { label: 'CAMP FOUND',  color: 'teal', icon: <CheckCircle2 size={22} />, payload: { parkId: selectedPark, zone: selectedZone, type: 'COMMUNITY', subType: 'POACHER_CAMP',  description: 'Evidence of recent illegal encampment discovered.' } },
        { label: 'DEAD ANIMAL', color: 'teal', icon: <Biohazard size={22} />,    payload: { parkId: selectedPark, zone: selectedZone, type: 'COMMUNITY', subType: 'DEAD_ANIMAL',   description: 'Dead wildlife reported — possible poaching or disease.' } },
    ];

    const colorMap: Record<string, { border: string, bg: string, text: string }> = {
        red:    { border: 'border-red-500/30',    bg: 'bg-red-500/10',    text: 'text-red-500' },
        orange: { border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-500' },
        amber:  { border: 'border-amber-500/30',  bg: 'bg-amber-500/10',  text: 'text-amber-500' },
        teal:   { border: 'border-teal-400/30',   bg: 'bg-teal-400/10',   text: 'text-teal-400' },
    };

    const renderButton = (btn: any, endpoint: string) => {
        const c = colorMap[btn.color];
        return (
            <button
                key={btn.label}
                onClick={() => triggerWebhook(endpoint, btn.payload)}
                className={`p-4 bg-[#0A0F1A] border ${c.border} rounded-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform group`}
            >
                <div className={`p-2.5 ${c.bg} rounded-full ${c.text} transition-colors`}>
                    {btn.icon}
                </div>
                <span className={`text-[9px] font-mono font-bold tracking-widest ${c.text}`}>{btn.label}</span>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-[#05080F] text-gray-200 font-sans p-4 flex flex-col select-none overflow-x-hidden">

            {/* Header */}
            <div className="flex items-center justify-between mb-5 pt-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded bg-vanguard-primary/20 border border-vanguard-primary/40">
                        <Smartphone className="text-vanguard-primary w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-syne font-bold tracking-tighter text-white">VANGUARD REMOTE</h1>
                        <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Mission Control Interface</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full border transition-all duration-300 flex items-center gap-1.5 ${
                    status.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                    status.type === 'error'   ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                               'bg-white/5 border-white/10 text-gray-500'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${status.type === 'success' ? 'bg-green-500 animate-pulse' : 'bg-current opacity-30'}`} />
                    <span className="text-[9px] font-mono font-bold tracking-widest leading-none">
                        {status.message || 'SYSTEM READY'}
                    </span>
                </div>
            </div>

            {/* Park Selector */}
            <div className="mb-4">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest font-bold">TARGET BATTLEGROUND</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {PARKS.map(p => (
                        <button key={p.id} onClick={() => { triggerHaptic(20); setSelectedPark(p.id); }}
                            className={`whitespace-nowrap px-3 py-2 rounded text-[10px] font-mono font-bold transition-all border ${
                                selectedPark === p.id
                                    ? 'bg-vanguard-primary/20 border-vanguard-primary text-vanguard-primary shadow-[0_0_15px_rgba(37,244,238,0.2)]'
                                    : 'bg-white/5 border-white/10 text-gray-500'
                            }`}>
                            {p.name.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Zone Selector */}
            <div className="mb-5">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest font-bold">SECTOR / ZONE</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {zones.map(z => (
                        <button key={z} onClick={() => { triggerHaptic(20); setSelectedZone(z); }}
                            className={`min-w-[44px] px-3 py-2 rounded text-xs font-mono font-bold transition-all border ${
                                selectedZone === z ? 'bg-white/20 border-white text-white' : 'bg-white/5 border-white/10 text-gray-500'
                            }`}>
                            {z}
                        </button>
                    ))}
                </div>
            </div>

            {/* Acoustic */}
            <div className="mb-4">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest font-bold">ACOUSTIC SENSORS</label>
                <div className="grid grid-cols-3 gap-2">{acousticButtons.map(btn => renderButton(btn, 'acoustic'))}</div>
            </div>

            {/* Vision */}
            <div className="mb-4">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest font-bold">CAMERA TRAPS</label>
                <div className="grid grid-cols-3 gap-2">{visionButtons.map(btn => renderButton(btn, 'vision'))}</div>
            </div>

            {/* Community */}
            <div className="mb-6">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest font-bold">COMMUNITY REPORTS</label>
                <div className="grid grid-cols-3 gap-2">{communityButtons.map(btn => renderButton(btn, 'community'))}</div>
            </div>

            {/* ── SELECTIVE PURGE ───────────────────────────────── */}
            <div className="mb-3 border border-white/10 rounded-lg overflow-hidden">
                <button
                    onClick={() => setSelectivePurgeOpen(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <ListX size={16} className="text-orange-400" />
                        <span className="text-xs font-mono font-bold tracking-widest text-orange-400">SELECTIVE ALERT PURGE</span>
                    </div>
                    {selectivePurgeOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                </button>

                {selectivePurgeOpen && (
                    <div className="p-3 bg-[#080D18] border-t border-white/10">
                        {/* Park filter note */}
                        <div className="text-[9px] font-mono text-gray-500 mb-3 tracking-widest">
                            SHOWING ALERTS FOR: <span className="text-orange-400">{park?.name?.toUpperCase()}</span>
                        </div>

                        {/* Controls row */}
                        <div className="flex items-center justify-between mb-3 gap-2">
                            <button
                                onClick={toggleSelectAll}
                                className="text-[10px] font-mono text-gray-400 border border-white/10 px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
                            >
                                {selectedAlertIds.size === liveAlerts.length && liveAlerts.length > 0 ? 'DESELECT ALL' : 'SELECT ALL'}
                            </button>
                            <button
                                onClick={fetchAlerts}
                                className="text-[10px] font-mono text-gray-400 border border-white/10 px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
                            >
                                ↻ REFRESH
                            </button>
                            <button
                                onClick={purgeSelected}
                                disabled={selectedAlertIds.size === 0}
                                className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded border transition-colors ${
                                    selectedAlertIds.size > 0
                                        ? 'border-orange-500/60 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                        : 'border-white/10 text-gray-600 cursor-not-allowed'
                                }`}
                            >
                                PURGE {selectedAlertIds.size > 0 ? `(${selectedAlertIds.size})` : ''}
                            </button>
                        </div>

                        {/* Alert list */}
                        <div className="max-h-64 overflow-y-auto space-y-1.5 no-scrollbar">
                            {loadingAlerts && (
                                <div className="text-[10px] font-mono text-gray-500 text-center py-4">LOADING ALERTS…</div>
                            )}
                            {!loadingAlerts && liveAlerts.length === 0 && (
                                <div className="text-[10px] font-mono text-gray-600 text-center py-4">NO ACTIVE ALERTS FOR THIS PARK</div>
                            )}
                            {!loadingAlerts && liveAlerts.map(alert => {
                                const isSelected = selectedAlertIds.has(alert.id);
                                return (
                                    <div
                                        key={alert.id}
                                        onClick={() => toggleAlertSelection(alert.id)}
                                        className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-orange-500/50 bg-orange-500/10'
                                                : `${getAlertBorderColor(alert.type)} bg-black/30 hover:bg-white/5`
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                            isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-600 bg-transparent'
                                        }`}>
                                            {isSelected && <span className="text-black text-[10px] font-bold">✓</span>}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                {getAlertTypeIcon(alert.type)}
                                                <span className="text-[11px] font-mono font-bold text-white truncate">
                                                    {alert.subType?.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[9px] font-mono text-gray-500 ml-auto shrink-0">{alert.zone}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 leading-tight line-clamp-1">{alert.description}</p>
                                            <div className="text-[9px] font-mono text-gray-600 mt-0.5">{alert.timestamp}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── FULL SYSTEM PURGE ─────────────────────────────── */}
            <div className="mt-auto pb-4">
                <button
                    onClick={() => { triggerHaptic([50, 100, 50]); triggerWebhook('clear', {}); }}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center gap-3 active:bg-red-500/20 active:border-red-500 transition-colors group"
                >
                    <Trash2 size={18} className="text-gray-500 group-active:text-red-500" />
                    <span className="text-xs font-mono font-bold tracking-[0.2em] text-gray-400 group-active:text-red-400">PURGE ENTIRE SYSTEM FEED</span>
                </button>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default RemoteController;
