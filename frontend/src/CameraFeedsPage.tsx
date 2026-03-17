import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Wifi, WifiOff, Link, ArrowLeft } from 'lucide-react';
import Header from './components/Header';
import { PARKS } from './lib/parksData';

const CameraFeedsPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const park = PARKS.find(p => p.id === id);
    const zones = park ? Object.keys(park.zones) : ['Z1', 'Z2', 'Z3', 'Z4'];

    const cameras = [
        { id: 'CAM-01', zone: zones[0] || 'Z1', status: 'ONLINE',  model: 'TrailGuard AI v2',   threat: 'NONE',     image: 'https://images.unsplash.com/photo-1610419993549-74d1252119eb?q=80&w=800&auto=format&fit=crop' },
        { id: 'CAM-02', zone: zones[1] || 'Z2', status: 'ONLINE',  model: 'TrailGuard AI v1',   threat: 'DETECTED', image: 'https://images.unsplash.com/photo-1564750965-0ae4bf597cfa?q=80&w=800&auto=format&fit=crop' },
        { id: 'CAM-03', zone: zones[2] || 'Z3', status: 'OFFLINE', model: 'TrailGuard AI v2',   threat: 'UNKNOWN',  image: null },
        { id: 'CAM-04', zone: zones[3] || 'Z4', status: 'ONLINE',  model: 'Standard IP Cam',    threat: 'NONE',     image: 'https://images.unsplash.com/photo-1549479366-cdca7d2d3aee?q=80&w=800&auto=format&fit=crop' },
        { id: 'CAM-05', zone: zones[4] || 'Z5', status: 'ONLINE',  model: 'TrailGuard AI v2',   threat: 'NONE',     image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop' },
        { id: 'CAM-06', zone: zones[5] || 'Z6', status: 'ONLINE',  model: 'Standard IP Cam',    threat: 'NONE',     image: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop' },
        { id: 'CAM-07', zone: zones[6] || 'Z7', status: 'OFFLINE', model: 'TrailGuard AI v1',   threat: 'UNKNOWN',  image: null },
        { id: 'CAM-08', zone: zones[7] || 'Z8', status: 'ONLINE',  model: 'TrailGuard AI v2',   threat: 'NONE',     image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=800&auto=format&fit=crop' },
    ];

    const onlineCount = cameras.filter(c => c.status === 'ONLINE').length;

    if (!id) return null;

    return (
        <div className="h-screen w-screen flex flex-col bg-vanguard-bg text-white overflow-hidden">
            <Header
                onBack={() => navigate(`/park/${id}`)}
                parkId={id}
                onSpeciesIntel={() => navigate(`/park/${id}/species`)}
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Page Header */}
                <div className="px-6 pt-5 pb-4 border-b border-vanguard-border bg-vanguard-panel flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/park/${id}`)}
                            className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3" /> BACK TO DASHBOARD
                        </button>
                        <div className="w-px h-4 bg-vanguard-border" />
                        <Camera className="w-5 h-5 text-vanguard-species" />
                        <h1 className="text-sm font-syne font-bold tracking-widest text-white uppercase">
                            Camera Feeds & Webhooks
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono">
                        <span className="text-green-400">{onlineCount} ONLINE</span>
                        <span className="text-gray-500">{cameras.length - onlineCount} OFFLINE</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">{park?.name?.toUpperCase()}</span>
                    </div>
                </div>

                {/* Camera Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {cameras.map((cam) => (
                            <div key={cam.id} className="bg-vanguard-panel border border-vanguard-border rounded-lg overflow-hidden flex flex-col">
                                {/* Camera Header */}
                                <div className="p-2.5 border-b border-vanguard-border flex items-center justify-between bg-black/40">
                                    <div className="flex items-center gap-2">
                                        <Camera size={13} className="text-gray-400" />
                                        <span className="text-xs font-mono font-bold text-gray-200">{cam.id}</span>
                                        <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                                            {cam.zone}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {cam.status === 'ONLINE' ? (
                                            <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-green-400">
                                                <Wifi size={9} /> ONLINE
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-gray-500">
                                                <WifiOff size={9} /> OFFLINE
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Viewfinder */}
                                <div className="h-44 bg-black relative flex items-center justify-center overflow-hidden">
                                    {cam.image ? (
                                        <>
                                            <img
                                                src={cam.image}
                                                alt="Camera Feed"
                                                className="w-full h-full object-cover opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500"
                                            />
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/30" />
                                                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/30" />
                                                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/30" />
                                                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/30" />
                                            </div>
                                            {cam.threat === 'DETECTED' && (
                                                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded animate-pulse">
                                                    THREAT DETECTED
                                                </div>
                                            )}
                                            <div className="absolute bottom-2 left-2">
                                                <span className="text-[8px] font-mono text-white/60 bg-black/50 px-1 rounded backdrop-blur">
                                                    {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-600">
                                            <WifiOff size={22} />
                                            <span className="text-[10px] font-mono tracking-widest">NO SIGNAL</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-3 bg-vanguard-bg border-t border-vanguard-border flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-500 font-mono tracking-widest">MODEL</span>
                                        <span className="text-[10px] text-gray-300">{cam.model}</span>
                                    </div>
                                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold font-mono bg-vanguard-species/10 text-vanguard-species border border-vanguard-species/30 rounded hover:bg-vanguard-species hover:text-white transition-colors">
                                        <Link size={10} /> CONNECT WEBHOOK
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraFeedsPage;
