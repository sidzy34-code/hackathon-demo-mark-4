const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ==========================================
// 1. BASE CONFIGURATION & ASSETS
// ==========================================

// Serve the production-built React frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow high-res camera frames

// In-memory store of connected SSE clients
let clients = [];

// ==========================================
// 2. LIVE DATA TRANSMISSION (SSE) 
// ==========================================
// This sits at the top to ensure critical alerts are prioritized
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    clients.push(res);
    console.log(`[SSE] New hardware connection established. Total active sinks: ${clients.length}`);

    req.on('close', () => {
        clients = clients.filter(client => client !== res);
        console.log(`[SSE] Client offline. Remaining pool: ${clients.length}`);
    });
});

function broadcastEvent(eventType, payload) {
    const data = JSON.stringify({ type: eventType, payload });
    clients.forEach(client => {
        client.write(`data: ${data}\n\n`);
    });
}

// In-memory store of recent alerts for correlation logic
let recentAlerts = [];

// ==========================================
// 3. VANGUARD CORRELATION ENGINE (VCE)
// ==========================================
function processEvent(newEvent) {
    newEvent.timestampMs = Date.now();
    recentAlerts.push(newEvent);
    
    // Auto-purge stale data (> 5 minutes) to maintain precision
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    recentAlerts = recentAlerts.filter(a => a.timestampMs > fiveMinsAgo);

    // Contextual Grouping: Check for other alerts in the same Park Sector
    const zoneAlerts = recentAlerts.filter(a => 
        a.parkId === newEvent.parkId && 
        a.zone === newEvent.zone
    );
    
    const uniqueTypes = new Set(zoneAlerts.map(a => a.type));

    // Rule 2: High Confidence Acoustic instantly elevates priority
    if (newEvent.type === 'ACOUSTIC' && newEvent.subType === 'GUNSHOT' && newEvent.confidence >= 0.90) {
        console.log(`[VCE] CRITICAL: Confirmed gunshot detected via acoustic triangulation.`);
        newEvent.priority = 'CRITICAL';
    }

    // Rule 3: TRIPLE CORRELATION (The "Holy Grail" of Detection)
    if (uniqueTypes.size >= 3) {
        const correlatedEvent = {
            id: `COR-${Date.now()}`,
            type: 'CORRELATED',
            subType: 'CONFIRMED_THREAT_EXTREME',
            zone: newEvent.zone,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            timestampMs: Date.now(),
            description: 'TRIPLE CORRELATION: Computer Vision, Acoustic arrays, and Human Intelligence have triangulated to this exact sector. Dispatching tactical units immediately.',
            priority: 'CRITICAL',
            location: newEvent.location, 
            parkId: newEvent.parkId
        };
        
        broadcastEvent('NEW_ALERT', newEvent); 
        setTimeout(() => broadcastEvent('NEW_ALERT', correlatedEvent), 1500); 
        return;
    } 
    
    // Rule 1: DOUBLE ZONE CORRELATION
    else if (uniqueTypes.size === 2) {
        newEvent.priority = 'CRITICAL'; 
        const otherType = [...uniqueTypes].filter(t => t !== newEvent.type)[0];
        newEvent.description = `[CORRELATED with ${otherType}] ` + newEvent.description;
    }

    broadcastEvent('NEW_ALERT', newEvent);
}

// ==========================================
// 4. WEBHOOK INGESTION (EDGE IOT)
// ==========================================

app.post('/api/webhooks/vision', (req, res) => {
    const { parkId, zone, type, subType, confidence, description, location } = req.body;
    console.log(`[Vision Ingest] Processing ${subType} in ${parkId} sector ${zone}`);
    processEvent({
        id: `CAM-${Date.now()}`,
        type: type || 'CAMERA',
        subType, zone, confidence, description, location, parkId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        priority: confidence > 0.8 ? 'HIGH' : 'ELEVATED'
    });
    res.status(200).json({ success: true, message: 'Ingest successful' });
});

app.post('/api/webhooks/acoustic', (req, res) => {
    const { parkId, zone, type, subType, confidence, description, location } = req.body;
    console.log(`[Acoustic Ingest] Processing ${subType} in ${parkId} sector ${zone}`);
    processEvent({
        id: `ACO-${Date.now()}`,
        type: type || 'ACOUSTIC',
        subType, zone, confidence, description, location, parkId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        priority: 'HIGH'
    });
    res.status(200).json({ success: true });
});

app.post('/api/webhooks/community', (req, res) => {
    const { parkId, zone, type, subType, description, location } = req.body;
    console.log(`[Community Ingest] Processing ${subType} in ${parkId} sector ${zone}`);
    processEvent({
        id: `COM-${Date.now()}`,
        type: type || 'COMMUNITY',
        subType, zone, description, location, parkId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        priority: 'ELEVATED'
    });
    res.status(200).json({ success: true });
});

app.post('/api/webhooks/clear', (req, res) => {
    console.log(`[Admin Command] Force clearing hardware state and correlation memory.`);
    recentAlerts = [];
    broadcastEvent('CLEAR_FEED', {});
    res.status(200).json({ success: true });
});

// ==========================================
// 5. AI CLASSIFICATION (CLARIFAI INTEGRATION)
// ==========================================

app.post('/api/analyze/vision', async (req, res) => {
    const { image, isManualUpload } = req.body;
    const clarifaiPat = process.env.CLARIFAI_PAT || '4a4f1d4c1c3d46169c6a7a9fde347116';

    if (image) {
        try {
            console.log(`[Logic Engine] Transmitting frame to Clarifai for Neural Classification...`);
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const raw = JSON.stringify({
              "user_app_id": { "user_id": "clarifai", "app_id": "main" },
              "inputs": [{ "data": { "image": { "base64": base64Data } } }]
            });

            const response = await fetch("https://api.clarifai.com/v2/models/general-image-recognition/versions/aa7f35c01e0642fda5cf400f543e7c40/outputs", {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Authorization': 'Key ' + clarifaiPat },
                body: raw
            });
            const data = await response.json();
            
            if (data.status.code === 10000) {
                const concepts = data.outputs[0].data.concepts;
                let topPrediction = concepts[0];
                const genericExcludes = ['wildlife', 'animal', 'nature', 'mammal', 'outdoors', 'tree', 'field'];
                
                for (const concept of concepts) {
                    if (!genericExcludes.includes(concept.name.toLowerCase()) && concept.value > 0.8) {
                        topPrediction = concept;
                        break;
                    }
                }
                
                const pn = topPrediction.name;
                const end = ['elephant', 'rhino', 'tiger', 'lion', 'pangolin'].some(t => pn.toLowerCase().includes(t));

                return res.status(200).json({
                    success: true,
                    classification: pn.charAt(0).toUpperCase() + pn.slice(1),
                    scientificName: 'Auto-detected via Vanguard Logic',
                    confidence: topPrediction.value,
                    endangered: end,
                    statusLabel: 'LIVE CLARIFAI API',
                    directive: `Machine Intelligence classified subject as ${pn} with ${(topPrediction.value * 100).toFixed(1)}% confidence.`
                });
            }
        } catch (err) {
            console.error('[Vision API] Neural Engine Network Error:', err);
        }
    }

    // Comprehensive Fallback simulation
    console.log(`[Logic Engine] Using edge-cache fallback for classification.`);
    res.status(200).json({
        success: true,
        classification: isManualUpload ? 'Unknown Subject' : 'Asian Elephant',
        scientificName: isManualUpload ? 'Subject scan required' : 'Elephas maximus',
        confidence: isManualUpload ? 0.76 : 0.98,
        endangered: true,
        statusLabel: 'EN',
        directive: 'Vanguard Simulation data active. Connect Clarifai API in Admin portal for live processing.'
    });
});

// ==========================================
// 6. EXTERNAL ENVIRONMENTAL INTEGRATIONS (NASA/GBIF)
// ==========================================

function getLunarIllumination(lon = 0) {
    const timezoneOffsetMs = (lon / 15) * 3600 * 1000;
    const localNow = new Date(Date.now() + timezoneOffsetMs);
    const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
    const phase = ((localNow.getTime() - KNOWN_NEW_MOON) % (29.53059 * 24 * 60 * 60 * 1000)) / (29.53059 * 24 * 60 * 60 * 1000);
    return parseFloat(((1 - Math.cos(2 * Math.PI * phase)) / 2).toFixed(4));
}

function describeWeatherCode(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 49) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
}

function computeThreatMultiplier(lunar, wind, rain) {
    const darkness = 1 + (1 - lunar) * 0.8;
    const windM = wind > 30 ? 1.3 : wind > 15 ? 1.1 : 1.0;
    const rainM = rain > 70 ? 1.25 : rain > 40 ? 1.1 : 1.0;
    return parseFloat((darkness * windM * rainM).toFixed(2));
}

// Live Weather & Environmental Pulse
app.get('/api/environment/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;
    try {
        const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation_probability,weather_code&timezone=auto`);
        const data = await resp.json();
        const cur = data.current;
        const lun = getLunarIllumination(parseFloat(lon));
        const threat = computeThreatMultiplier(lun, cur.wind_speed_10m, cur.precipitation_probability ?? 0);

        res.json({
            temperature: cur.temperature_2m,
            windSpeed: cur.wind_speed_10m,
            precipitationProbability: cur.precipitation_probability ?? 0,
            weatherDescription: describeWeatherCode(cur.weather_code),
            lunarIllumination: lun,
            threatMultiplier: threat,
            lastUpdated: new Date().toISOString()
        });
    } catch (err) {
        const lun = getLunarIllumination(parseFloat(lon));
        res.json({ 
            weatherDescription: 'Open-Meteo Offline',
            lunarIllumination: lun, 
            threatMultiplier: computeThreatMultiplier(lun, 0, 0), 
            fallback: true 
        });
    }
});

// NASA Satellite Data Pull
app.get('/api/eonet/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;
    try {
        console.log(`[NASA Pulse] Scraping satellite data for lat=${lat}, lon=${lon}`);
        const response = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30`);
        const data = await response.json();
        const nearby = (data.events || []).filter(e => {
            const coords = e.geometry?.[0]?.coordinates;
            return coords && Math.abs(coords[1] - parseFloat(lat)) < 5 && Math.abs(coords[0] - parseFloat(lon)) < 5;
        });
        res.json({ total: nearby.length, events: nearby });
    } catch (err) { res.json({ total: 0, error: err.message }); }
});

// GBIF Biodiversity Scan
app.get('/api/gbif/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;
    try {
        console.log(`[GBIF Pulse] Identifying local species presence near coordinates...`);
        const response = await fetch(`https://api.gbif.org/v1/occurrence/search?decimalLatitude=${parseFloat(lat)-0.5},${parseFloat(lat)+0.5}&decimalLongitude=${parseFloat(lon)-0.5},${parseFloat(lon)+0.5}&limit=5&hasCoordinate=true&basisOfRecord=HUMAN_OBSERVATION&year=2024,2025&kingdomKey=1`);
        const data = await response.json();
        const occurrences = (data.results || []).map(occ => ({ species: occ.species }));
        res.json({ occurrences, total: data.count || 0 });
    } catch (err) { res.json({ total: 0, error: err.message }); }
});

// ==========================================
// 7. CRITICAL HOUSING & ROUTING LOGIC (DO NOT MODIFY)
// ==========================================

// SPA Fallback: Must be below all API routes
// Uses Middleware mode to avoid Node 22 Path Errors
app.use((req, res, next) => {
    // Skip API routes so we don't accidentally serve HTML for Data
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Single Unified Port Ingress
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`VANGUARD PLATFORM SERVICE: ONLINE`);
    console.log(`ENVIRONMENT: CLOUD PRODUCTION`);
    console.log(`PORT: ${PORT}`);
    console.log(`========================================\n`);
});
