import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, Play, Pause, AlertTriangle, Volume2, MapPin, Clock, ArrowLeft } from 'lucide-react';
import Header from './components/Header';
import { PARKS } from './lib/parksData';

type ThreatLevel = 'THREAT' | 'WILDLIFE' | 'AMBIENT';

interface SampleClip {
    id: string;
    name: string;
    duration: string;
    type: 'GUNSHOT' | 'CHAINSAW' | 'VEHICLE' | 'TIGER_CALL' | 'ELEPHANT_CALL' | 'AMBIENT';
}

interface AudioEvent {
    id: string;
    parkId: string;
    zone: string;
    timestamp: string;
    classification: string;
    threatLevel: ThreatLevel;
    confidence: number;
    sourceType: 'ACOUSTIC_SENSOR' | 'COMMUNITY';
}

interface AnalysisResult {
    label: string;
    confidence: number;
    threatLevel: ThreatLevel;
    recommendedAction: string;
    source?: string;
}

const SAMPLES: SampleClip[] = [
    { id: 'forest-gunshot', name: 'Forest Gunshot',  duration: '0:07', type: 'GUNSHOT' },
    { id: 'chainsaw',       name: 'Chainsaw',         duration: '0:12', type: 'CHAINSAW' },
    { id: 'vehicle-engine', name: 'Vehicle Engine',   duration: '0:09', type: 'VEHICLE' },
    { id: 'tiger-call',     name: 'Tiger Call',       duration: '0:11', type: 'TIGER_CALL' },
    { id: 'elephant-call',  name: 'Elephant Call',    duration: '0:08', type: 'ELEPHANT_CALL' },
    { id: 'ambient-forest', name: 'Ambient Forest',   duration: '0:20', type: 'AMBIENT' },
];

const threatColors: Record<ThreatLevel, string> = {
    THREAT:  'bg-red-500/10 border-red-500/40 text-red-400',
    WILDLIFE:'bg-amber-500/10 border-amber-500/40 text-amber-300',
    AMBIENT: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
};

const threatLabelText: Record<ThreatLevel, string> = {
    THREAT:  'THREAT DETECTED',
    WILDLIFE:'WILDLIFE',
    AMBIENT: 'AMBIENT',
};

const SoundAnalysisPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const park = useMemo(() => PARKS.find(p => p.id === id), [id]);

    const [selectedSample, setSelectedSample] = useState<SampleClip | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [customAudioName, setCustomAudioName] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisSource, setAnalysisSource] = useState<'live' | 'demo'>('demo');
    const [events, setEvents] = useState<AudioEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoadingEvents(true);
        fetch(`/api/audio/${id}`)
            .then(r => r.json())
            .then(data => setEvents(data || []))
            .catch(() => setEvents([]))
            .finally(() => setLoadingEvents(false));
    }, [id]);

    const handleSelectSample = (sample: SampleClip) => {
        setSelectedSample(sample);
        setCustomAudioName(null);
        setAnalysisResult(null);
        setIsPlaying(true);
    };

    const handleUploadAudio = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = () => {
            const file = input.files?.[0];
            if (file) {
                setSelectedSample(null);
                setCustomAudioName(file.name);
                setAnalysisResult(null);
                setIsPlaying(true);
            }
        };
        input.click();
    };

    const deriveAnalysisForSample = (sample: SampleClip): AnalysisResult => {
        switch (sample.type) {
            case 'GUNSHOT':      return { label: 'Gunshot (High Confidence)', confidence: 0.96, threatLevel: 'THREAT',   recommendedAction: 'Treat as confirmed gunshot. Dispatch nearest ranger unit and cross-check camera traps in adjacent zones.' };
            case 'CHAINSAW':     return { label: 'Chainsaw Detected',         confidence: 0.93, threatLevel: 'THREAT',   recommendedAction: 'Possible illegal logging activity. Notify forestry staff and deploy patrol to triangulated coordinates.' };
            case 'VEHICLE':      return { label: 'Vehicle Engine',            confidence: 0.88, threatLevel: 'THREAT',   recommendedAction: 'Unscheduled vehicle activity. Check authorized vehicle list and coordinate with gate staff.' };
            case 'TIGER_CALL':   return { label: 'Tiger Vocalization',        confidence: 0.91, threatLevel: 'WILDLIFE', recommendedAction: 'Predator vocalization detected. Log for behavior monitoring and avoid routing tourists into this sector.' };
            case 'ELEPHANT_CALL':return { label: 'Elephant Call',             confidence: 0.89, threatLevel: 'WILDLIFE', recommendedAction: 'Elephant herd presence likely. Caution heavy vehicles and maintain buffer from crop-field interfaces.' };
            default:             return { label: 'Ambient Forest Soundscape', confidence: 0.82, threatLevel: 'AMBIENT',  recommendedAction: 'No immediate threat. Use as calibration sample for sensor health checks.' };
        }
    };

    const handleAnalyze = async () => {
        if (!canAnalyze) return;
        setAnalyzing(true);
        setAnalysisResult(null);
        try {
            const sampleType = selectedSample?.type || 'AMBIENT';
            const res = await fetch('/api/analyze/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sampleId: sampleType, sampleType, customLabel: customAudioName || undefined }),
            });
            if (res.ok) {
                const data = await res.json();
                setAnalysisResult({ label: data.label, confidence: data.confidence, threatLevel: data.threatLevel as ThreatLevel, recommendedAction: data.recommendedAction });
                setAnalysisSource(data.source === 'openrouter' ? 'live' : 'demo');
            } else if (selectedSample) {
                setAnalysisResult(deriveAnalysisForSample(selectedSample));
                setAnalysisSource('demo');
            }
        } catch {
            if (selectedSample) {
                setAnalysisResult(deriveAnalysisForSample(selectedSample));
                setAnalysisSource('demo');
            }
        } finally {
            setAnalyzing(false);
            setIsPlaying(false);
        }
    };

    const canAnalyze = !!selectedSample || !!customAudioName;
    const threatPillClass = analysisResult ? threatColors[analysisResult.threatLevel] : '';

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
                        <button onClick={() => navigate(`/park/${id}`)} className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-3 h-3" /> BACK TO DASHBOARD
                        </button>
                        <div className="w-px h-4 bg-vanguard-border" />
                        <Activity className="w-5 h-5 text-vanguard-community" />
                        <h1 className="text-sm font-syne font-bold tracking-widest text-white uppercase">Sound Analysis</h1>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{park?.name?.toUpperCase()}</span>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Sample Library + Analyzer */}
                    <div className="lg:col-span-2 flex flex-col gap-4">

                        {/* Waveform visualizer */}
                        <div className="bg-vanguard-panel border border-vanguard-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-vanguard-community" />
                                    <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">
                                        {selectedSample ? selectedSample.name : customAudioName ? customAudioName : 'No sample selected'}
                                    </span>
                                </div>
                                {(selectedSample || customAudioName) && (
                                    <button onClick={() => setIsPlaying(p => !p)} className="p-1.5 rounded bg-vanguard-community/10 border border-vanguard-community/30 text-vanguard-community hover:bg-vanguard-community/20 transition-colors">
                                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                    </button>
                                )}
                            </div>
                            <div className="h-16 flex items-center justify-center gap-0.5 overflow-hidden rounded bg-black/40 px-4">
                                {Array.from({ length: 60 }).map((_, i) => (
                                    <div key={i} className="w-1 rounded-full bg-vanguard-community/60 transition-all"
                                        style={{
                                            height: isPlaying ? `${20 + Math.abs(Math.sin((i * 0.4))) * 40}%` : `${8 + Math.abs(Math.sin(i * 0.5)) * 20}%`,
                                            opacity: isPlaying ? 0.8 : 0.3,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Sample Library */}
                        <div className="bg-vanguard-panel border border-vanguard-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Volume2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">Sample Library</span>
                                </div>
                                <button onClick={handleUploadAudio} className="text-[9px] font-mono text-vanguard-community border border-vanguard-community/30 px-2 py-1 rounded hover:bg-vanguard-community/10 transition-colors">
                                    + UPLOAD AUDIO
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {SAMPLES.map(sample => {
                                    const isSelected = selectedSample?.id === sample.id;
                                    const isThreat = ['GUNSHOT', 'CHAINSAW', 'VEHICLE'].includes(sample.type);
                                    const isWildlife = ['TIGER_CALL', 'ELEPHANT_CALL'].includes(sample.type);
                                    const borderCol = isThreat ? 'border-red-500/30' : isWildlife ? 'border-amber-500/30' : 'border-emerald-500/30';
                                    const textCol = isThreat ? 'text-red-400' : isWildlife ? 'text-amber-400' : 'text-emerald-400';
                                    return (
                                        <button key={sample.id} onClick={() => handleSelectSample(sample)}
                                            className={`flex flex-col gap-1 p-3 rounded border text-left transition-all ${isSelected ? `${borderCol} bg-vanguard-community/10` : 'border-vanguard-border bg-black/40 hover:border-vanguard-border/80'}`}>
                                            <div className="flex items-center justify-between">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${borderCol} ${textCol}`}><Play size={10} /></span>
                                                <span className="text-[9px] font-mono text-gray-500">{sample.duration}</span>
                                            </div>
                                            <span className="text-[10px] font-syne text-white leading-tight">{sample.name}</span>
                                            <span className={`text-[9px] font-mono ${textCol}`}>{isThreat ? 'THREAT' : isWildlife ? 'WILDLIFE' : 'AMBIENT'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Analyze Button + Result */}
                        <div className="bg-vanguard-panel border border-vanguard-border rounded-lg p-4 space-y-3">
                            <button onClick={handleAnalyze} disabled={!canAnalyze || analyzing}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-mono rounded border ${
                                    canAnalyze ? 'border-vanguard-community/60 bg-vanguard-community/20 text-vanguard-community hover:bg-vanguard-community/30' : 'border-vanguard-border text-gray-600 bg-black/40 cursor-not-allowed'
                                }`}>
                                {analyzing ? 'ANALYZING WAVEFORM…' : 'ANALYZE AUDIO'}
                            </button>

                            {analysisResult && (
                                <div className="border border-vanguard-border rounded-lg bg-black/70 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-syne text-white">{analysisResult.label}</span>
                                            <span className="text-[10px] font-mono text-gray-500">Confidence <span className="text-vanguard-community">{(analysisResult.confidence * 100).toFixed(1)}%</span></span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${threatPillClass}`}>{threatLabelText[analysisResult.threatLevel]}</span>
                                    </div>
                                    <div className="w-full h-2 bg-vanguard-border rounded overflow-hidden">
                                        <div className={`h-full ${analysisResult.threatLevel === 'THREAT' ? 'bg-red-500' : analysisResult.threatLevel === 'WILDLIFE' ? 'bg-amber-400' : 'bg-emerald-400'} transition-all duration-500`}
                                            style={{ width: `${Math.min(100, analysisResult.confidence * 100 + 5)}%` }} />
                                    </div>
                                    <div className="flex items-start gap-2 text-[10px] font-mono text-gray-300">
                                        <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                                        <span>{analysisResult.recommendedAction}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-gray-500 mt-1">
                                        {analysisSource === 'live' ? 'Recommendation generated by Open Router (live AI).' : 'Classification is deterministic for demo. Set OPENROUTER_API_KEY for AI-generated recommendations.'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: 24h Acoustic Log */}
                    <div className="flex flex-col bg-vanguard-panel border border-vanguard-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-vanguard-border bg-black/40">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-vanguard-community" />
                                <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase">24H Acoustic Events</span>
                            </div>
                            {loadingEvents && <span className="text-[10px] font-mono text-gray-500">STREAMING…</span>}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-vanguard-border/60">
                            {!loadingEvents && events.length === 0 && (
                                <div className="p-4 text-[10px] font-mono text-gray-500">No acoustic events logged in the last 24 hours.</div>
                            )}
                            {events.map(event => {
                                const level: ThreatLevel = event.threatLevel;
                                return (
                                    <div key={event.id} className="flex flex-col gap-1 p-3 hover:bg-black/40">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-syne text-white">{event.classification}</span>
                                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${threatColors[level]}`}>{threatLabelText[level]}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <span>{(event.confidence * 100).toFixed(0)}%</span>
                                                <div className="w-16 h-1 bg-vanguard-border rounded overflow-hidden">
                                                    <div className={`h-full ${level === 'THREAT' ? 'bg-red-500' : level === 'WILDLIFE' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                                        style={{ width: `${Math.min(100, event.confidence * 100 + 5)}%` }} />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-vanguard-community" />
                                                    <span>{event.zone}</span>
                                                </div>
                                                <span>{event.timestamp}</span>
                                            </div>
                                        </div>
                                        <div className="text-[9px] font-mono text-gray-600">{event.sourceType === 'ACOUSTIC_SENSOR' ? 'ACOUSTIC SENSOR' : 'COMMUNITY REPORT'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoundAnalysisPage;
