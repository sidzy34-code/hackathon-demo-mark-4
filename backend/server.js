const express = require('express');
const cors = require('cors');
const path = require('path'); // Added path module

const app = express();
const PORT = process.env.PORT || 3333; // Added PORT constant

app.use(express.static(path.join(__dirname, '../frontend/dist'))); // Added static middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Kept original express.json with limit

// In-memory store of connected SSE clients
let clients = [];

// SSE Endpoint
app.get('/api/events', (req, res) => {
    // Required headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add this new client to our list
    clients.push(res);
    console.log(`[SSE] Client connected. Total clients: ${clients.length}`);

    // Clean up when client disconnects
    req.on('close', () => {
        clients = clients.filter(client => client !== res);
        console.log(`[SSE] Client disconnected. Total clients: ${clients.length}`);
    });
});

// Helper to broadcast events to all connected clients
// Serve index.html for all other routes (React Router support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

function broadcastEvent(eventType, payload) { // Corrected parameter name from 'type' to 'eventType'
    const data = JSON.stringify({ type: eventType, payload });
    clients.forEach(client => {
        client.write(`data: ${data}\n\n`);
    });
}

// In-memory store of recent alerts for correlation
let recentAlerts = [];

// ==========================================
// CORRELATION ENGINE Core Logic
// ==========================================
function processEvent(newEvent) {
    // Stage the new event (keep internal timestamp for easy math)
    newEvent.timestampMs = Date.now();
    recentAlerts.push(newEvent);
    
    // Clean old alerts (> 5 mins) to prevent memory leaks and stale correlations
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    recentAlerts = recentAlerts.filter(a => a.timestampMs > fiveMinsAgo);

    // Filter for alerts in this exact park AND zone
    const zoneAlerts = recentAlerts.filter(a => 
        a.parkId === newEvent.parkId && 
        a.zone === newEvent.zone
    );
    
    const uniqueTypes = new Set(zoneAlerts.map(a => a.type));

    // Rule 2: High Confidence Acoustic instantly elevates priority
    if (newEvent.type === 'ACOUSTIC' && newEvent.subType === 'GUNSHOT' && newEvent.confidence >= 0.90) {
        newEvent.priority = 'CRITICAL';
    }

    // Rule 3: TRIPLE CORRELATION 
    if (uniqueTypes.size >= 3) {
        // Create an overarching AI correlation event
        const correlatedEvent = {
            id: `COR-${Date.now()}`,
            type: 'CORRELATED',
            subType: 'CONFIRMED_THREAT_EXTREME',
            zone: newEvent.zone,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            timestampMs: Date.now(),
            description: 'TRIPLE CORRELATION: Computer Vision, Acoustic arrays, and Human Intelligence reports have triangulated to this exact sector. Immediate tactical ranger dispatch strictly advised.',
            priority: 'CRITICAL',
            location: newEvent.location, 
            parkId: newEvent.parkId
        };
        
        // Broadcast the origin event first
        broadcastEvent('NEW_ALERT', newEvent); 
        
        // Broadcast the massive correlation event a second later for dramatic effect
        setTimeout(() => broadcastEvent('NEW_ALERT', correlatedEvent), 1500); 
        return;
    } 
    
    // Rule 1: DOUBLE ZONE CORRELATION
    else if (uniqueTypes.size === 2) {
        newEvent.priority = 'CRITICAL'; 
        const otherType = [...uniqueTypes].filter(t => t !== newEvent.type)[0];
        newEvent.description = `[CORRELATED with earlier ${otherType} alert] ` + newEvent.description;
    }

    // Standard broadcast
    broadcastEvent('NEW_ALERT', newEvent);
}

// ==========================================
// Webhook Endpoints (Simulating Edge IoT devices)
// ==========================================

app.post('/api/webhooks/vision', (req, res) => {
    const { parkId, zone, type, subType, confidence, description, location } = req.body;
    console.log(`[Vision Ingest] ${subType} in ${parkId} - ${zone}`);

    processEvent({
        id: `CAM-${Date.now()}`,
        type: type || 'CAMERA',
        subType,
        zone,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        confidence,
        description,
        priority: confidence > 0.8 ? 'HIGH' : 'ELEVATED',
        location,
        parkId
    });

    res.status(200).json({ success: true, message: 'Vision event processed' });
});

app.post('/api/webhooks/acoustic', (req, res) => {
    const { parkId, zone, type, subType, confidence, description, location } = req.body;
    console.log(`[Acoustic Ingest] ${subType} in ${parkId} - ${zone}`);

    processEvent({
        id: `ACO-${Date.now()}`,
        type: type || 'ACOUSTIC',
        subType,
        zone,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        confidence,
        description,
        priority: 'HIGH', // Will be elevated by processEvent if necessary
        location,
        parkId
    });

    res.status(200).json({ success: true, message: 'Acoustic event processed' });
});

app.post('/api/webhooks/community', (req, res) => {
    const { parkId, zone, type, subType, description, location } = req.body;
    console.log(`[Community Ingest] ${subType} in ${parkId} - ${zone}`);

    processEvent({
        id: `COM-${Date.now()}`,
        type: type || 'COMMUNITY',
        subType,
        zone,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        description,
        priority: 'ELEVATED',
        location,
        parkId
    });

    res.status(200).json({ success: true, message: 'Community event processed' });
});

app.post('/api/webhooks/clear', (req, res) => {
    console.log(`[Demo Command] Instructed frontend and correlation engine to purge state`);
    recentAlerts = []; // Clear correlation array
    broadcastEvent('CLEAR_FEED', {});
    res.status(200).json({ success: true });
});

// ==========================================
// AI Classification Endpoints
// ==========================================
app.post('/api/analyze/vision', async (req, res) => {
    const { image, isManualUpload } = req.body;
    
    // Realistic logging
    console.log(`[Vision API] Received classification request. Manual Upload: ${isManualUpload}`);

    const clarifaiPat = process.env.CLARIFAI_PAT || '4a4f1d4c1c3d46169c6a7a9fde347116';

    if (image) {
        try {
            console.log(`[Vision API] Routing to Clarifai General Model Endpoint...`);
            
            // Clarifai expects base64 without the data URI prefix
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            
            const raw = JSON.stringify({
              "user_app_id": {
                "user_id": "clarifai",
                "app_id": "main"
              },
              "inputs": [
                {
                  "data": {
                    "image": {
                      "base64": base64Data
                    }
                  }
                }
              ]
            });

            const requestOptions = {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Key ' + clarifaiPat
                },
                body: raw
            };

            // Using the Clarifai General Image Recognition Model
            const response = await fetch("https://api.clarifai.com/v2/models/general-image-recognition/versions/aa7f35c01e0642fda5cf400f543e7c40/outputs", requestOptions);
            const data = await response.json();
            
            if (data.status.code !== 10000) {
                 throw new Error(`Clarifai API Error: ${data.status.description}`);
            }

            const concepts = data.outputs[0].data.concepts;
            
            // Find the most relevant animal/threat concept. 
            // Clarifai's general model returns a mix of concepts. We'll pick the top one that isn't too generic if possible.
            let topPrediction = concepts[0];
            const genericExcludes = ['wildlife', 'animal', 'nature', 'mammal', 'outdoors', 'grass', 'tree', 'field'];
            
            for (const concept of concepts) {
                if (!genericExcludes.includes(concept.name.toLowerCase()) && concept.value > 0.8) {
                    topPrediction = concept;
                    break;
                }
            }
            
            const predictedName = topPrediction.name;
            const confidenceScore = topPrediction.value;
            
            // Determine directive based on generic heuristics for the demo
            const isEndangered = ['elephant', 'rhino', 'tiger', 'lion', 'pangolin', 'jaguar'].some(threat => predictedName.toLowerCase().includes(threat));

            return res.status(200).json({
                success: true,
                classification: predictedName.charAt(0).toUpperCase() + predictedName.slice(1),
                scientificName: 'Auto-detected via Clarifai',
                confidence: confidenceScore,
                endangered: isEndangered,
                statusLabel: 'CLARIFAI API',
                directive: `Model successfully classified subject as ${predictedName} with ${(confidenceScore * 100).toFixed(1)}% confidence.`
            });
        } catch (err) {
            console.error('[Vision API] Clarifai API failed, falling back to mock.', err);
        }
    }

    // Fallback Path (Realistic Mock)
    console.log(`[Vision API] Executing edge fallback mock simulation...`);
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    res.status(200).json({
        success: true,
        classification: isManualUpload ? 'Unknown Subject' : 'Asian Elephant',
        scientificName: isManualUpload ? 'Subject to manual review' : 'Elephas maximus',
        confidence: isManualUpload ? 0.762 : 0.984,
        endangered: isManualUpload ? false : true,
        statusLabel: isManualUpload ? 'NEUTRAL' : 'EN',
        directive: isManualUpload ? 
            'Custom image classification utilizes generalized model. For specialized Vanguard taxonomy mapping, integration with Microsoft Azure Custom Vision API via Admin Panel is recommended.' :
            'High-value target identified in Sector Z4. Proximity to local communities is currently safe. No further action required. Logging event to Smart Connect database.'
    });
});


// ==========================================
// STEP 4.5: Realistic Environmental Data APIs
// ==========================================

// --- Lunar Illumination Calculator (Timezone/Region-aware) ---
// Takes observer longitude to approximate local timezone offset.
// This means India (~lon 77) and Africa (~lon 30) will compute
// illumination for their actual local nighttime, not just UTC.
function getLunarIllumination(lon = 0) {
    // Approximate timezone offset from longitude (15° per hour)
    const timezoneOffsetHours = lon / 15;
    const localNow = new Date(Date.now() + timezoneOffsetHours * 3600 * 1000);

    // Standard astronomical calculation for moon phase
    const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
    const LUNAR_CYCLE_MS = 29.530588853 * 24 * 60 * 60 * 1000;
    const elapsed = localNow.getTime() - KNOWN_NEW_MOON;
    const currentCycle = ((elapsed % LUNAR_CYCLE_MS) + LUNAR_CYCLE_MS) % LUNAR_CYCLE_MS;
    const phase = currentCycle / LUNAR_CYCLE_MS; // 0 = new moon, 0.5 = full moon
    // Illumination formula: 0 at new moon, 1 at full moon
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
    return parseFloat(illumination.toFixed(4));
}

// --- Weather code to human description ---
function describeWeatherCode(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 49) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Rain showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
}

// --- Threat multiplier formula ---
function computeThreatMultiplier(lunarIllumination, windSpeed, precipitationProb) {
    // Lower lunar illumination = more dangerous (poachers prefer darkness)
    const darknessMultiplier = 1 + (1 - lunarIllumination) * 0.8;
    // High wind = acoustic sensors degrade
    const windMultiplier = windSpeed > 30 ? 1.3 : windSpeed > 15 ? 1.1 : 1.0;
    // High precipitation = camera degradation + increased poaching opportunity
    const rainMultiplier = precipitationProb > 70 ? 1.25 : precipitationProb > 40 ? 1.1 : 1.0;
    return parseFloat((darknessMultiplier * windMultiplier * rainMultiplier).toFixed(2));
}

// GET /api/environment/:lat/:lon — Live weather via Open-Meteo + computed lunar data
app.get('/api/environment/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;
    console.log(`[Environment API] Fetching data for lat=${lat}, lon=${lon}`);

    try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation_probability,weather_code&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error(`Open-Meteo responded with ${weatherResponse.status}`);
        const weatherData = await weatherResponse.json();

        const current = weatherData.current;
        const lunarIllumination = getLunarIllumination(parseFloat(lon));
        const threatMultiplier = computeThreatMultiplier(
            lunarIllumination,
            current.wind_speed_10m,
            current.precipitation_probability ?? 0
        );

        const result = {
            temperature: current.temperature_2m,
            windSpeed: current.wind_speed_10m,
            precipitationProbability: current.precipitation_probability ?? 0,
            weatherCode: current.weather_code,
            weatherDescription: describeWeatherCode(current.weather_code),
            lunarIllumination,
            threatMultiplier,
            lastUpdated: new Date().toISOString()
        };

        console.log(`[Environment API] Success: ${result.weatherDescription}, Temp: ${result.temperature}°C, Threat: ${result.threatMultiplier}x`);
        res.json(result);
    } catch (err) {
        console.error('[Environment API] Open-Meteo failed:', err.message);
        // Fallback with computed lunar data at minimum
        const lunarIllumination = getLunarIllumination(parseFloat(lon));
        res.json({
            temperature: null,
            windSpeed: null,
            precipitationProbability: null,
            weatherCode: null,
            weatherDescription: 'Data unavailable',
            lunarIllumination,
            threatMultiplier: computeThreatMultiplier(lunarIllumination, 0, 0),
            lastUpdated: new Date().toISOString(),
            fallback: true
        });
    }
});

// GET /api/eonet/:lat/:lon — NASA EONET API: real satellite disaster events near a park
app.get('/api/eonet/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;
    console.log(`[EONET API] Fetching satellite events near lat=${lat}, lon=${lon}`);

    try {
        // Fetch recent open events (fires, floods, storms) from NASA EONET
        const eonetUrl = `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20&days=30`;
        const response = await fetch(eonetUrl);
        if (!response.ok) throw new Error(`EONET responded with ${response.status}`);
        const data = await response.json();

        // Filter events within ~500km of the park (rough degree bounding box)
        const DEGREE_RADIUS = 5.0;
        const nearbyEvents = (data.events || []).filter(event => {
            const coords = event.geometry?.[0]?.coordinates;
            if (!coords) return false;
            const [eLon, eLat] = coords;
            return Math.abs(eLat - parseFloat(lat)) < DEGREE_RADIUS &&
                   Math.abs(eLon - parseFloat(lon)) < DEGREE_RADIUS;
        }).map(event => ({
            id: event.id,
            title: event.title,
            category: event.categories?.[0]?.title || 'Unknown',
            date: event.geometry?.[0]?.date,
            coordinates: event.geometry?.[0]?.coordinates
        }));

        console.log(`[EONET API] Found ${nearbyEvents.length} nearby satellite events`);
        res.json({ events: nearbyEvents, total: data.events?.length || 0 });
    } catch (err) {
        console.error('[EONET API] Failed:', err.message);
        res.json({ events: [], error: err.message });
    }
});

// GET /api/gbif/:lat/:lon — GBIF: recent wildlife species occurrences near park
app.get('/api/gbif/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;
    console.log(`[GBIF API] Fetching species occurrences near lat=${lat}, lon=${lon}`);

    try {
        // Query GBIF occurrence API for recent wildlife sightings
        const gbifUrl = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${parseFloat(lat) - 0.5},${parseFloat(lat) + 0.5}&decimalLongitude=${parseFloat(lon) - 0.5},${parseFloat(lon) + 0.5}&limit=10&hasCoordinate=true&basisOfRecord=HUMAN_OBSERVATION&year=2024,2025&kingdomKey=1`;
        const response = await fetch(gbifUrl);
        if (!response.ok) throw new Error(`GBIF responded with ${response.status}`);
        const data = await response.json();

        const occurrences = (data.results || []).map(occ => ({
            species: occ.species || occ.scientificName || 'Unknown species',
            commonName: occ.vernacularName || null,
            date: occ.eventDate || null,
            lat: occ.decimalLatitude,
            lon: occ.decimalLongitude,
            recordedBy: occ.recordedBy || 'Field observer'
        }));

        console.log(`[GBIF API] Found ${occurrences.length} species occurrences`);
        res.json({ occurrences, total: data.count || 0 });
    } catch (err) {
        console.error('[GBIF API] Failed:', err.message);
        res.json({ occurrences: [], error: err.message });
    }
});

// Periodic environment broadcast via SSE (every 5 minutes for the first connected park)
let environmentBroadcastInterval = null;
let lastBroadcastCoords = null;

function startEnvironmentBroadcast(lat, lon) {
    if (environmentBroadcastInterval) return; // Already running
    lastBroadcastCoords = { lat, lon };
    console.log(`[Environment SSE] Starting periodic broadcast for lat=${lat}, lon=${lon}`);

    const doFetch = async () => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,precipitation_probability,weather_code&timezone=auto`;
            const weatherResponse = await fetch(url);
            if (!weatherResponse.ok) return;
            const weatherData = await weatherResponse.json();
            const current = weatherData.current;
            const lunarIllumination = getLunarIllumination(parseFloat(lon));
            const payload = {
                temperature: current.temperature_2m,
                windSpeed: current.wind_speed_10m,
                precipitationProbability: current.precipitation_probability ?? 0,
                weatherCode: current.weather_code,
                weatherDescription: describeWeatherCode(current.weather_code),
                lunarIllumination,
                threatMultiplier: computeThreatMultiplier(lunarIllumination, current.wind_speed_10m, current.precipitation_probability ?? 0),
                lastUpdated: new Date().toISOString()
            };
            broadcastEvent('ENVIRONMENT_UPDATE', payload);
            console.log(`[Environment SSE] Broadcasted environment update: ${payload.weatherDescription}`);
        } catch (e) {
            console.error('[Environment SSE] Broadcast failed:', e.message);
        }
    };

    doFetch(); // Fire immediately
    environmentBroadcastInterval = setInterval(doFetch, 5 * 60 * 1000); // Then every 5 min
}
// To this (added a slash):
app.get('/*', (req, res) => { 
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
// Start the server using the PORT defined at the top
app.listen(PORT, () => {
    console.log(`Vanguard API / SSE Tracker running on port ${PORT}`);
});

