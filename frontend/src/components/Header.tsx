import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Shield, Activity, Fingerprint, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    onBack?: () => void;
    parkId?: string | null;
    onSpeciesIntel?: () => void;
    // onCameraFeeds and onSoundAnalysis removed — now navigate to pages internally
}

const Header: React.FC<HeaderProps> = ({ onBack, parkId, onSpeciesIntel }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="h-14 bg-black border-b border-vanguard-border flex items-center justify-between px-6 shrink-0 z-50">
            {/* Left: Logo and Back */}
            <div className="flex items-center gap-4">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-vanguard-species hover:text-white transition-colors bg-vanguard-species/10 px-2 py-1 rounded"
                    >
                        <ArrowLeft className="w-3 h-3" /> CHANGE PARK
                    </button>
                )}
                <div className="flex items-center gap-3">
                    <Shield className="text-vanguard-zoneClear w-6 h-6" />
                    <h1 className="text-xl font-bold tracking-widest text-white uppercase flex items-baseline">
                        Vanguard
                    </h1>
                </div>
            </div>

            {/* Center: Park name */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <h2 className="text-[13px] font-bold tracking-[0.2em] text-gray-200 uppercase">
                    {parkId ? parkId.replace('-', ' ') : 'NAGARHOLE'} NATIONAL PARK
                </h2>
                <span className="text-[10px] text-vanguard-camera font-mono bg-vanguard-camera/10 px-2 py-0.5 rounded mt-1 border border-vanguard-camera/20">
                    PROTECTED AREA
                </span>
            </div>

            {/* Right: Nav buttons + Clock */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => parkId && navigate(`/park/${parkId}/cameras`)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-vanguard-panel border border-vanguard-border rounded hover:bg-gray-800 transition-colors"
                >
                    <Fingerprint className="w-4 h-4 text-vanguard-species" />
                    CAMERA FEEDS
                </button>
                <button
                    onClick={onSpeciesIntel ?? (() => parkId && navigate(`/park/${parkId}/species`))}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-vanguard-panel border border-vanguard-border rounded hover:bg-gray-800 transition-colors"
                >
                    <span className="w-2 h-2 rounded-full bg-vanguard-species animate-pulse" />
                    SPECIES ID
                </button>
                <button
                    onClick={() => parkId && navigate(`/park/${parkId}/sound`)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-vanguard-panel border border-vanguard-border rounded hover:bg-gray-800 transition-colors"
                >
                    <Activity className="w-4 h-4 text-vanguard-community" />
                    SOUND ANALYSIS
                </button>

                <div className="h-4 w-px bg-vanguard-border mx-2" />
                <div className="text-sm font-mono text-gray-300 w-48 text-right">
                    {format(currentTime, 'MMM dd, yyyy | HH:mm:ss')}
                </div>
            </div>
        </header>
    );
};

export default Header;
