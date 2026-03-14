const express = require('express');
const cors = require('cors');
const path = require('path');
<<<<<<< HEAD
=======
const fs = require('fs');
>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)

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

<<<<<<< HEAD
=======
// Simple disk-backed store for fauna catalog and camera spottings
const DATA_DIR = path.join(__dirname, 'data');
const FAUNA_FILE = path.join(DATA_DIR, 'fauna.json');
const SPOTTINGS_FILE = path.join(DATA_DIR, 'spottings.json');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readJsonSafe(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, 'utf8');
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJsonSafe(filePath, value) {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

// Seed fauna catalog with rough, publicly available estimates (approximate, for demo only)
function seedFaunaIfEmpty() {
    const existing = readJsonSafe(FAUNA_FILE, null);
    if (existing) return existing;
    const seeded = {
        nagarhole: [
            {
                id: 'ngh-tiger',
                parkId: 'nagarhole',
                commonName: 'Bengal Tiger',
                scientificName: 'Panthera tigris tigris',
                estimatedCount: 150,
                status: 'EN',
                notes: 'High-density tiger landscape; estimate aggregated from recent Karnataka tiger census reports.'
            },
            {
                id: 'ngh-elephant',
                parkId: 'nagarhole',
                commonName: 'Asian Elephant',
                scientificName: 'Elephas maximus indicus',
                estimatedCount: 800,
                status: 'EN',
                notes: 'Part of the larger Nilgiri elephant landscape; rough pooled estimate.'
            },
            {
                id: 'ngh-leopard',
                parkId: 'nagarhole',
                commonName: 'Indian Leopard',
                scientificName: 'Panthera pardus fusca',
                estimatedCount: 120,
                status: 'VU',
                notes: 'Leopard density inferred from camera trap studies overlapping tiger grids.'
            }
        ],
        corbett: [
            {
                id: 'cor-tiger',
                parkId: 'corbett',
                commonName: 'Bengal Tiger',
                scientificName: 'Panthera tigris tigris',
                estimatedCount: 250,
                status: 'EN',
                notes: 'Corbett landscape holds one of India’s highest tiger populations; figure is rounded for demo.'
            },
            {
                id: 'cor-elephant',
                parkId: 'corbett',
                commonName: 'Asian Elephant',
                scientificName: 'Elephas maximus indicus',
                estimatedCount: 1000,
                status: 'EN',
                notes: 'Trans-Himalayan elephant population estimate pooled across Corbett–Rajaji corridor.'
            },
            {
                id: 'cor-gharial',
                parkId: 'corbett',
                commonName: 'Gharial',
                scientificName: 'Gavialis gangeticus',
                estimatedCount: 40,
                status: 'CR',
                notes: 'Critically endangered riverine crocodilian; small, reintroduced population.'
            }
        ],
        kaziranga: [
            {
                id: 'kaz-rhino',
                parkId: 'kaziranga',
                commonName: 'Indian One-horned Rhinoceros',
                scientificName: 'Rhinoceros unicornis',
                estimatedCount: 2600,
                status: 'VU',
                notes: 'Approximate based on 2018 census (~2,613 individuals).'
            },
            {
                id: 'kaz-elephant',
                parkId: 'kaziranga',
                commonName: 'Asian Elephant',
                scientificName: 'Elephas maximus indicus',
                estimatedCount: 1200,
                status: 'EN',
                notes: 'Large breeding population across Kaziranga–Karbi Anglong complex.'
            },
            {
                id: 'kaz-tiger',
                parkId: 'kaziranga',
                commonName: 'Bengal Tiger',
                scientificName: 'Panthera tigris tigris',
                estimatedCount: 120,
                status: 'EN',
                notes: 'High tiger density; rounded composite estimate for the demo.'
            }
        ],
        sundarbans: [
            {
                id: 'sun-tiger',
                parkId: 'sundarbans',
                commonName: 'Sundarbans Bengal Tiger',
                scientificName: 'Panthera tigris tigris',
                estimatedCount: 100,
                status: 'EN',
                notes: 'Mangrove-adapted tiger population across Indian Sundarbans; rounded for demo.'
            },
            {
                id: 'sun-dolphin',
                parkId: 'sundarbans',
                commonName: 'Irrawaddy Dolphin',
                scientificName: 'Orcaella brevirostris',
                estimatedCount: 80,
                status: 'EN',
                notes: 'Estimates vary widely; small estuarine population used for indicative purposes.'
            },
            {
                id: 'sun-crocodile',
                parkId: 'sundarbans',
                commonName: 'Estuarine Crocodile',
                scientificName: 'Crocodylus porosus',
                estimatedCount: 250,
                status: 'LC',
                notes: 'Large apex reptile; number is coarse-grained, for visualization only.'
            }
        ],
        'maasai-mara': [
            {
                id: 'mara-lion',
                parkId: 'maasai-mara',
                commonName: 'African Lion',
                scientificName: 'Panthera leo melanochaita',
                estimatedCount: 850,
                status: 'VU',
                notes: 'Covers the broader Mara–Serengeti system; Mara-only number would be lower.'
            },
            {
                id: 'mara-elephant',
                parkId: 'maasai-mara',
                commonName: 'African Savanna Elephant',
                scientificName: 'Loxodonta africana',
                estimatedCount: 2500,
                status: 'EN',
                notes: 'Mobile cross-border population between Kenya and Tanzania.'
            },
            {
                id: 'mara-rhino',
                parkId: 'maasai-mara',
                commonName: 'Black Rhinoceros',
                scientificName: 'Diceros bicornis michaeli',
                estimatedCount: 40,
                status: 'CR',
                notes: 'Small remnant population under intense protection.'
            }
        ],
        kruger: [
            {
                id: 'kru-elephant',
                parkId: 'kruger',
                commonName: 'African Savanna Elephant',
                scientificName: 'Loxodonta africana',
                estimatedCount: 19500,
                status: 'EN',
                notes: 'Rounded from SANParks reports (~19–20k individuals).'
            },
            {
                id: 'kru-white-rhino',
                parkId: 'kruger',
                commonName: 'Southern White Rhinoceros',
                scientificName: 'Ceratotherium simum simum',
                estimatedCount: 2500,
                status: 'NT',
                notes: 'Numbers have declined sharply; value given is illustrative.'
            },
            {
                id: 'kru-wild-dog',
                parkId: 'kruger',
                commonName: 'African Wild Dog',
                scientificName: 'Lycaon pictus',
                estimatedCount: 150,
                status: 'EN',
                notes: 'Highly mobile packs; small meta-population within Greater Kruger.'
            }
        ]
    };
    writeJsonSafe(FAUNA_FILE, seeded);
    return seeded;
}

function seedSpottingsIfEmpty() {
    const existing = readJsonSafe(SPOTTINGS_FILE, null);
    if (existing) return existing;
    const now = new Date();
    const iso = (offsetMinutes) => new Date(now.getTime() - offsetMinutes * 60000).toISOString();
    const seeded = {
        nagarhole: [
            {
                id: 'ngh-spot-1',
                parkId: 'nagarhole',
                speciesCommonName: 'Asian Elephant',
                scientificName: 'Elephas maximus indicus',
                zone: 'Z2',
                timestamp: iso(35),
                imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop',
                visionMode: 'DAY'
            },
            {
                id: 'ngh-spot-2',
                parkId: 'nagarhole',
                speciesCommonName: 'Bengal Tiger',
                scientificName: 'Panthera tigris tigris',
                zone: 'Z4',
                timestamp: iso(120),
                imageUrl: 'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?q=80&w=800&auto=format&fit=crop',
                visionMode: 'NIGHT'
            }
        ],
        corbett: [
            {
                id: 'cor-spot-1',
                parkId: 'corbett',
                speciesCommonName: 'Bengal Tiger',
                scientificName: 'Panthera tigris tigris',
                zone: 'Z3',
                timestamp: iso(90),
                imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=800&auto=format&fit=crop',
                visionMode: 'NIGHT'
            }
        ],
        kaziranga: [
            {
                id: 'kaz-spot-1',
                parkId: 'kaziranga',
                speciesCommonName: 'Indian One-horned Rhinoceros',
                scientificName: 'Rhinoceros unicornis',
                zone: 'Z1',
                timestamp: iso(45),
                imageUrl: 'https://images.unsplash.com/photo-1524135329990-07660cd5bf10?q=80&w=800&auto=format&fit=crop',
                visionMode: 'DAY'
            }
        ],
        sundarbans: [
            {
                id: 'sun-spot-1',
                parkId: 'sundarbans',
                speciesCommonName: 'Sundarbans Bengal Tiger',
                scientificName: 'Panthera tigris tigris',
                zone: 'Z5',
                timestamp: iso(15),
                imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop',
                visionMode: 'NIGHT'
            }
        ],
        'maasai-mara': [
            {
                id: 'mara-spot-1',
                parkId: 'maasai-mara',
                speciesCommonName: 'African Lion',
                scientificName: 'Panthera leo melanochaita',
                zone: 'Z6',
                timestamp: iso(60),
                imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop',
                visionMode: 'DAY'
            }
        ],
        kruger: [
            {
                id: 'kru-spot-1',
                parkId: 'kruger',
                speciesCommonName: 'African Wild Dog',
                scientificName: 'Lycaon pictus',
                zone: 'Z7',
                timestamp: iso(25),
                imageUrl: 'https://images.unsplash.com/photo-1601758493928-1993e6ec87cd?q=80&w=800&auto=format&fit=crop',
                visionMode: 'DAY'
            }
        ]
    };
    writeJsonSafe(SPOTTINGS_FILE, seeded);
    return seeded;
}

let faunaStore = seedFaunaIfEmpty();
let spottingsStore = seedSpottingsIfEmpty();

>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)
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
<<<<<<< HEAD
// 5. AI CLASSIFICATION (CLARIFAI INTEGRATION)
=======
// 5. FAUNA CATALOG & 24H SPOTTINGS (PERSISTENT)
// ==========================================

app.get('/api/fauna/:parkId', (req, res) => {
    const { parkId } = req.params;
    faunaStore = readJsonSafe(FAUNA_FILE, faunaStore || {});
    const list = faunaStore[parkId] || [];
    res.json(list);
});

app.post('/api/fauna/:parkId', (req, res) => {
    const { parkId } = req.params;
    const { commonName, scientificName, estimatedCount, status, notes } = req.body || {};
    faunaStore = readJsonSafe(FAUNA_FILE, faunaStore || {});
    const entry = {
        id: `${parkId}-${Date.now()}`,
        parkId,
        commonName,
        scientificName,
        estimatedCount: Number(estimatedCount) || 0,
        status: status || '',
        notes: notes || ''
    };
    faunaStore[parkId] = [...(faunaStore[parkId] || []), entry];
    writeJsonSafe(FAUNA_FILE, faunaStore);
    res.status(201).json(entry);
});

app.put('/api/fauna/:parkId/:id', (req, res) => {
    const { parkId, id } = req.params;
    const { commonName, scientificName, estimatedCount, status, notes } = req.body || {};
    faunaStore = readJsonSafe(FAUNA_FILE, faunaStore || {});
    const list = faunaStore[parkId] || [];
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Not found' });
    }
    const updated = {
        ...list[idx],
        commonName: commonName ?? list[idx].commonName,
        scientificName: scientificName ?? list[idx].scientificName,
        estimatedCount: estimatedCount != null ? Number(estimatedCount) || 0 : list[idx].estimatedCount,
        status: status ?? list[idx].status,
        notes: notes ?? list[idx].notes
    };
    list[idx] = updated;
    faunaStore[parkId] = list;
    writeJsonSafe(FAUNA_FILE, faunaStore);
    res.json(updated);
});

app.delete('/api/fauna/:parkId/:id', (req, res) => {
    const { parkId, id } = req.params;
    faunaStore = readJsonSafe(FAUNA_FILE, faunaStore || {});
    const list = faunaStore[parkId] || [];
    const next = list.filter(e => e.id !== id);
    faunaStore[parkId] = next;
    writeJsonSafe(FAUNA_FILE, faunaStore);
    res.json({ success: true });
});

app.get('/api/spottings/:parkId', (req, res) => {
    const { parkId } = req.params;
    spottingsStore = readJsonSafe(SPOTTINGS_FILE, spottingsStore || {});
    const list = (spottingsStore[parkId] || []).filter(s => {
        const ts = new Date(s.timestamp).getTime();
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return ts >= cutoff;
    });
    res.json(list);
});

// ==========================================
// 6. AI CLASSIFICATION (CLARIFAI INTEGRATION)
>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)
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
<<<<<<< HEAD
// 6. EXTERNAL ENVIRONMENTAL INTEGRATIONS (NASA/GBIF)
=======
// 7. EXTERNAL ENVIRONMENTAL INTEGRATIONS (NASA/GBIF)
>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)
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
<<<<<<< HEAD
// 7. CRITICAL HOUSING & ROUTING LOGIC (DO NOT MODIFY)
=======
// 8. CRITICAL HOUSING & ROUTING LOGIC (DO NOT MODIFY)
>>>>>>> 7cebabe7 (Initial Vanguard species intel and fauna persistence)
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
