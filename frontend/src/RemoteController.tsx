import React, { useState } from 'react';
import { Zap, Activity, ShieldAlert, Users, Trash2, Smartphone, MapPin, CheckCircle2 } from 'lucide-react';
import { PARKS } from './lib/parksData';

const RemoteController: React.FC = () => {
    const [selectedPark, setSelectedPark] = useState(PARKS[0].id);
    const [selectedZone, setSelectedZone] = useState('Z3');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    // Haptic feedback
    const triggerHaptic = (pattern: number | number[] = 50) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
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
        } catch (error) {
            setStatus({ type: 'error', message: 'OFFLINE / SERVER ERROR' });
        }
    };

    const park = PARKS.find(p => p.id === selectedPark);
    const zones = park ? Object.keys(park.zones) : ['Z1', 'Z2', 'Z3', 'Z4'];

    return (
        <div className="min-h-screen bg-[#05080F] text-gray-200 font-sans p-4 flex flex-col select-none overflow-x-hidden">
            
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6 pt-2">
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
                    status.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                    'bg-white/5 border-white/10 text-gray-500'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${status.type === 'success' ? 'bg-green-500 animate-pulse' : 'bg-current opacity-30'}`}></div>
                    <span className="text-[9px] font-mono font-bold tracking-widest leading-none">
                        {status.message || 'SYSTEM READY'}
                    </span>
                </div>
            </div>

            {/* Target Selection - Horizontal Swipe */}
            <div className="mb-6">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest font-bold">TARGET BATTLEGROUND</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {PARKS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { triggerHaptic(20); setSelectedPark(p.id); }}
                            className={`whitespace-nowrap px-4 py-2.5 rounded text-xs font-mono font-bold transition-all border ${
                                selectedPark === p.id 
                                    ? 'bg-vanguard-primary/20 border-vanguard-primary text-vanguard-primary shadow-[0_0_15px_rgba(37,244,238,0.2)]' 
                                    : 'bg-white/5 border-white/10 text-gray-500'
                            }`}
                        >
                            {p.name.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-widest font-bold uppercase">Sector / Zone</label>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {zones.map(z => (
                        <button
                            key={z}
                            onClick={() => { triggerHaptic(20); setSelectedZone(z); }}
                            className={`min-w-[50px] px-3 py-2.5 rounded text-xs font-mono font-bold transition-all border ${
                                selectedZone === z 
                                    ? 'bg-white/20 border-white text-white' 
                                    : 'bg-white/5 border-white/10 text-gray-500'
                            }`}
                        >
                            {z}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tactical Trigger Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                
                {/* Acoustic Section */}
                <button 
                    onClick={() => triggerWebhook('acoustic', { parkId: selectedPark, zone: selectedZone, type: 'ACOUSTIC', subType: 'GUNSHOT', confidence: 0.95, description: 'High-caliber discharge detected in sector.', location: [0,0] })}
                    className="p-5 bg-[#0A0F1A] border border-red-500/30 rounded-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform group"
                >
                    <div className="p-3 bg-red-500/10 rounded-full group-active:bg-red-500 group-active:text-white text-red-500 transition-colors">
                        <Zap size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-red-500 group-active:text-white">GUNSHOT</span>
                </button>

                <button 
                    onClick={() => triggerWebhook('acoustic', { parkId: selectedPark, zone: selectedZone, type: 'ACOUSTIC', subType: 'CHAINSAW', confidence: 0.92, description: 'Motorized cutting signature detected.', location: [0,0] })}
                    className="p-5 bg-[#0A0F1A] border border-orange-500/30 rounded-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform group"
                >
                    <div className="p-3 bg-orange-500/10 rounded-full group-active:bg-orange-500 group-active:text-white text-orange-500 transition-colors">
                        <Activity size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-orange-500 group-active:text-white">CHAINSAW</span>
                </button>

                {/* Vision Section */}
                <button 
                    onClick={() => triggerWebhook('vision', { parkId: selectedPark, zone: selectedZone, type: 'CAMERA', subType: 'HUMAN_PRESENCE', confidence: 0.88, description: 'Unauthorized individual detected.', location: [0,0] })}
                    className="p-5 bg-[#0A0F1A] border border-amber-500/30 rounded-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform group"
                >
                    <div className="p-3 bg-amber-500/10 rounded-full group-active:bg-amber-500 group-active:text-white text-amber-500 transition-colors">
                        <ShieldAlert size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 group-active:text-white">HUMAN</span>
                </button>

                <button 
                    onClick={() => triggerWebhook('vision', { parkId: selectedPark, zone: selectedZone, type: 'CAMERA', subType: 'VEHICLE_DETECTED', confidence: 0.85, description: 'Suspicious motor vehicle detected.', location: [0,0] })}
                    className="p-5 bg-[#0A0F1A] border border-amber-500/30 rounded-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform group"
                >
                    <div className="p-3 bg-amber-500/10 rounded-full group-active:bg-amber-500 group-active:text-white text-amber-500 transition-colors">
                        <MapPin size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 group-active:text-white">VEHICLE</span>
                </button>

                {/* Community Section */}
                <button 
                    onClick={() => triggerWebhook('community', { parkId: selectedPark, zone: selectedZone, type: 'COMMUNITY', subType: 'SNARE_DETECTED', description: 'Active wire snare line reported.', location: [0,0] })}
                    className="p-5 bg-[#0A0F1A] border border-vanguard-primary/30 rounded-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform group"
                >
                    <div className="p-3 bg-vanguard-primary/10 rounded-full group-active:bg-vanguard-primary group-active:text-black text-vanguard-primary transition-colors">
                        <Users size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-vanguard-primary group-active:text-black uppercase">Snare Line</span>
                </button>

                <button 
                    onClick={() => triggerWebhook('community', { parkId: selectedPark, zone: selectedZone, type: 'COMMUNITY', subType: 'POACHER_CAMP', description: 'Evidence of recent illegal encampment.', location: [0,0] })}
                    className="p-5 bg-[#0A0F1A] border border-vanguard-primary/30 rounded-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform group"
                >
                    <div className="p-3 bg-vanguard-primary/10 rounded-full group-active:bg-vanguard-primary group-active:text-black text-vanguard-primary transition-colors">
                        <CheckCircle2 size={24} />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-vanguard-primary group-active:text-black uppercase">Camp Found</span>
                </button>

            </div>

            {/* Global Reset */}
            <div className="mt-auto pb-4">
                <button 
                    onClick={() => { triggerHaptic([50, 100, 50]); triggerWebhook('clear', {}); }}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center gap-3 active:bg-red-500/20 active:border-red-500 transition-colors group"
                >
                    <Trash2 size={18} className="text-gray-500 group-active:text-red-500" />
                    <span className="text-xs font-mono font-bold tracking-[0.2em] text-gray-400 group-active:text-red-400">PURGE SYSTEM FEED</span>
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
