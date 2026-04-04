import { supabase } from '../lib/supabaseClient';
import { AlertEvent } from '../lib/parksData';

// ─── In-memory narrative cache (keyed by alert ID) ──────────────────────────
// Because live alerts come from SSE (not Supabase), we cache generated
// narratives here so they persist across re-renders without a Supabase round-trip.
const narrativeCache = new Map<string, { text: string; generatedAt: string }>();

export function getCachedNarrative(alertId: string) {
  return narrativeCache.get(alertId) ?? null;
}

// ─── Context builder ─────────────────────────────────────────────────────────
function buildContext(triggerAlert: AlertEvent, recentAlerts: AlertEvent[]) {
  return {
    trigger_event: {
      zone_id: triggerAlert.zone,
      severity: triggerAlert.priority,
      source_type: triggerAlert.type,
      description: triggerAlert.description,
      confidence: triggerAlert.confidence ?? null,
      timestamp: triggerAlert.timestamp,
      sub_type: triggerAlert.subType,
    },
    recent_zone_events: recentAlerts
      .filter(a => a.zone === triggerAlert.zone && a.id !== triggerAlert.id)
      .slice(-10)
      .map(e => ({
        source_type: e.type,
        description: e.description,
        confidence: e.confidence ?? null,
        severity: e.priority,
        timestamp: e.timestamp,
        sub_type: e.subType,
      })),
    zone_id: triggerAlert.zone,
    event_count_last_60_min: recentAlerts.filter(a => a.zone === triggerAlert.zone).length,
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateNarrative(
  alert: AlertEvent,
  recentAlerts: AlertEvent[]
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set');

  const context = buildContext(alert, recentAlerts);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `You are an operational intelligence officer embedded with a wildlife protection ranger unit. 
You receive structured JSON data from a sensor network and generate urgent operational briefings for rangers in the field.

Your briefings must follow this exact structure:
1. A timestamp and one-sentence situation summary on the first line (format: "HH:MM — [situation]")
2. A blank line
3. "PRECEDING EVENTS:" followed by 2-4 bullet points of key events in chronological order, each starting with a timestamp offset (e.g. "−43 min:")
4. A blank line  
5. "THREAT ASSESSMENT:" — one sentence on direction of movement or likely target if determinable, or "Insufficient data to determine movement vector" if not
6. A blank line
7. "RECOMMENDED ACTION:" — one specific, actionable instruction with timing. Name a gate, road, or coordinate if zone context allows. Start with a verb.

Rules: Write for a ranger who has 6 seconds to read this while running. Every word must earn its place. No hedging language. No passive voice. No filler phrases like "it appears" or "it seems." If confidence is high, be decisive. If confidence is moderate, say so in one word ("Probable:" or "Possible:") then commit to the assessment anyway.`
          }]
        },
        contents: [{
          parts: [{
            text: `Generate an operational intelligence briefing for this alert:\n\n${JSON.stringify(context, null, 2)}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== 'string') {
    throw new Error('Narrative generation failed');
  }

  const generatedAt = new Date().toISOString();

  // Cache it in-memory
  narrativeCache.set(alert.id, { text, generatedAt });

  // Write to Supabase as secondary action (non-blocking, best-effort)
  supabase
    .from('alerts')
    .upsert({
      id: alert.id,
      zone_id: alert.zone,
      severity: alert.priority,
      source_type: alert.type,
      description: alert.description,
      confidence: alert.confidence ? Math.round(alert.confidence * 100) : null,
      narrative: text,
      narrative_generated_at: generatedAt,
    }, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) console.warn('[narrativeEngine] Supabase write failed (non-critical):', error.message);
    });

  return text;
}
