const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// --- 1. MIDDLEWARE & STATIC FILES ---
// Serve the built React frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory store of connected SSE clients
let clients = [];

// --- 2. LIVE DATA (SSE) ENDPOINT ---
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    clients.push(res);
    console.log(`[SSE] Client connected. Total clients: ${clients.length}`);

    req.on('close', () => {
        clients = clients.filter(client => client !== res);
        console.log(`[SSE] Client disconnected. Total clients: ${clients.length}`);
    });
});

function broadcastEvent(eventType, payload) {
    const data = JSON.stringify({ type: eventType, payload });
    clients.forEach(client => {
        client.write(`data: ${data}\n\n`);
    });
}

// --- 3. CORRELATION ENGINE ---
let recentAlerts = [];

function processEvent(newEvent) {
    newEvent.timestampMs = Date.now();
    recentAlerts.push(newEvent);
    
    // Cleanup old alerts (> 5 mins)
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    recentAlerts = recentAlerts.filter(a => a.timestampMs > fiveMinsAgo);

    const zoneAlerts = recentAlerts.filter(a => 
        a.parkId === newEvent.parkId && 
        a.zone === newEvent.zone
    );
    
    const uniqueTypes = new Set(zoneAlerts.map(a => a.type));

    // Priority Elevation for high-confidence gunshots
    if (newEvent.type === 'ACOUSTIC' && newEvent.subType === 'GUNSHOT' && newEvent.confidence >= 0.90) {
        newEvent.priority = 'CRITICAL';
    }

    // Triple Correlation Logic
    if (uniqueTypes.size >= 3) {
        const correlatedEvent = {
            id: `COR-${Date.now()}`,
            type: 'CORRELATED',
            subType: 'CONFIRMED_THREAT_EXTREME',
            zone: newEvent.zone,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            timestampMs: Date.now(),
            description: 'TRIPLE CORRELATION: AI Vision, Acoustic Arrays, and Human Intelligence have triangulated this exact sector. Tactical dispatch advised.',
            priority: 'CRITICAL',
            location: newEvent.location, 
            parkId: newEvent.parkId
        };
        
        broadcastEvent('NEW_ALERT', newEvent); 
        setTimeout(() => broadcastEvent('NEW_ALERT', correlatedEvent), 1500); 
        return;
    } 
    else if (uniqueTypes.size === 2) {
        newEvent.priority = 'CRITICAL'; 
        const otherType = [...uniqueTypes].filter(t => t !== newEvent.type)[0];
        newEvent.description = `[CORRELATED with ${otherType}] ` + newEvent.description;
    }

    broadcastEvent('NEW_ALERT', newEvent);
}

// --- 4. WEBHOOKS (EDGE INGEST) ---
app.post('/api/webhooks/vision', (req, res) => {
    const { parkId, zone, type, subType, confidence, description, location } = req.body;
    processEvent({
        id: `CAM-${Date.now()}`,
        type: type || 'CAMERA',
        subType, zone, confidence, description, location, parkId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        priority: confidence > 0.8 ? 'HIGH' : 'ELEVATED'
    });
    res.status(200).json({ success: true });
});

app.post('/api/webhooks/acoustic', (req, res) => {
    const { parkId, zone, type, subType, confidence, description, location } = req.body;
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
    recentAlerts = [];
    broadcastEvent('CLEAR_FEED', {});
    res.status(200).json({ success: true });
});

// --- 5. AI CLASSIFICATION (CLARIFAI) ---
app.post('/api/analyze/vision', async (req, res) => {
    const { image, isManualUpload } = req.body;
    const clarifaiPat = process.env.CLARIFAI_PAT || '4a4f1d4c1c3d46169c6a7a9fde347116';

    if (image) {
        try {
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
                const genericExcludes = ['wildlife', 'animal', 'nature', 'mammal', 'outdoors'];
                
                for (const concept of concepts) {
                    if (!genericExcludes.includes(concept.name.toLowerCase()) && concept.value > 0.8) {
                        topPrediction = concept;
                        break;
                    }
                }
                
                const pn = topPrediction.name;
                const end = ['elephant', 'rhino', 'tiger', 'lion'].some(t => pn.toLowerCase().includes(t));

                return res.status(200).json({
                    success: true,
                    classification: pn.charAt(0).toUpperCase() + pn.slice(1),
                    scientificName: 'Auto-detected (Clarifai)',
                    confidence: topPrediction.value,
                    endangered: end,
                    statusLabel: 'LIVE API',
                    directive: `Subject classified: ${pn} (${(topPrediction.value * 100).toFixed(1)}%).`
                });
            }
        } catch (err) { console.error('[Vision API] Error:', err); }
    }

    res.status(200).json({ success: true, classification: 'Asian Elephant', endangered: true, directive: 'Service Fallback Active.' });
});

// --- 6. ENVIRONMENTAL DATA ---
function getLunarIllumination(lon = 0) {
    const timezoneOffsetMs = (lon / 15) * 3600 * 1000;
    const localNow = new Date(Date.now() + timezoneOffsetMs);
    const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
    const phase = ((localNow.getTime() - KNOWN_NEW_MOON) % (29.53059 * 24 * 60 * 60 * 1000)) / (29.53059 * 24 * 60 * 60 * 1000);
    return parseFloat(((1 - Math.cos(2 * Math.PI * phase)) / 2).toFixed(4));
}

app.get('/api/environment/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;
    try {
        const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation_probability,weather_code&timezone=auto`);
        const data = await resp.json();
        const cur = data.current;
        const lun = getLunarIllumination(parseFloat(lon));
        res.json({
            temperature: cur.temperature_2m,
            lunarIllumination: lun,
            weatherDescription: 'Clear', 
            lastUpdated: new Date().toISOString()
        });
    } catch (err) { res.json({ lunarIllumination: 0.5, fallback: true }); }
});

// --- 7. DEPLOYMENT CRITICAL ROUTING (DO NOT MOVE) ---

// Catch-all: Redirect any non-API request to the React index.html
// This MUST use "/*" for modern Node/Express on Render
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// The single, final PORT definition
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`Vanguard System ONLINE on Port ${PORT}`);
});
