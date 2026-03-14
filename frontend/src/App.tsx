import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import Header from './components/Header';
import MapPanel from './components/MapPanel';
import AlertFeed from './components/AlertFeed';
import ZoneStatus from './components/ZoneStatus';
import QuickStats from './components/QuickStats';
import EnvironmentPanel from './components/EnvironmentPanel';
import LandingPage from './LandingPage';
<<<<<<< HEAD
=======
import SpeciesIntelPage from './SpeciesIntelPage';
>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)
import CameraFeedsModal from './components/CameraFeedsModal';
import CommunityReportModal from './components/CommunityReportModal';
import RemoteController from './RemoteController';

const DashboardView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cameraFeedsOpen, setCameraFeedsOpen] = useState(false);
    const [communityModalOpen, setCommunityModalOpen] = useState(false);

    if (!id) return <Navigate to="/" />;

    return (
        <div className="h-screen w-screen flex flex-col bg-vanguard-bg text-white overflow-hidden">
            <Header 
                onBack={() => navigate('/')} 
                parkId={id} 
                onCameraFeeds={() => setCameraFeedsOpen(true)} 
<<<<<<< HEAD
=======
                onSpeciesIntel={() => navigate(`/park/${id}/species`)}
>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-row overflow-hidden border-t border-vanguard-border">

                {/* Left Side: Map (60%) */}
                <div className="w-[60%] h-full border-r border-vanguard-border flex flex-col relative bg-black">
                    <MapPanel parkId={id} />

                    {/* Floating Community Report Button on the Map */}
                    <div className="absolute bottom-6 left-6 z-[1000]">
                        <button 
                            onClick={() => setCommunityModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-3 bg-vanguard-camera/90 border border-vanguard-camera shadow-xl shadow-vanguard-camera/20 hover:bg-vanguard-camera backdrop-blur text-[#0A0F1A] rounded-full font-bold font-syne tracking-widest text-xs transition-all hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            SUBMIT COMMUNITY REPORT
                        </button>
                    </div>
                </div>

                {/* Right Side: Panels (40%) */}
                <div className="w-[40%] h-full flex flex-col bg-vanguard-bg overflow-y-auto custom-scrollbar">
                    
                    <div className="flex flex-col min-h-max">
                        {/* Top right panel: Live Alert Feed */}
                        <div className="border-b border-vanguard-border">
                            <AlertFeed parkId={id} />
                        </div>

                        {/* Middle right panel: Zone Status Overview */}
                        <div className="border-b border-vanguard-border">
                            <ZoneStatus parkId={id} />
                        </div>

                        {/* Bottom right panel: Environment + Quick Stats */}
                        <div className="bg-vanguard-bg border-t border-vanguard-border flex flex-col">
                            <div className="p-3 border-b border-vanguard-border shrink-0">
                                <EnvironmentPanel parkId={id} />
                            </div>
                            <div className="flex-1">
                                <QuickStats parkId={id} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {cameraFeedsOpen && <CameraFeedsModal parkId={id} onClose={() => setCameraFeedsOpen(false)} />}
            {communityModalOpen && <CommunityReportModal parkId={id} onClose={() => setCommunityModalOpen(false)} />}
        </div>
    );
};

const LandingWrapper = () => {
    const navigate = useNavigate();
    return <LandingPage onSelectPark={(parkId) => navigate(`/park/${parkId}`)} />;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingWrapper />} />
                <Route path="/park/:id" element={<DashboardView />} />
<<<<<<< HEAD
=======
                <Route path="/park/:id/species" element={<SpeciesIntelPage />} />
>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)
                <Route path="/remote" element={<RemoteController />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
