import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { animal_id, species, zone_id, camera_trap_id } = await req.json()

    // Step 1: Insert the sighting record
    const { data: sighting, error: sightingError } = await supabase
      .from('tracked_animals')
      .insert({
        animal_id,
        species,
        zone_id,
        camera_trap_id,
        confirmed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (sightingError) throw sightingError

    // Step 2: Look up correlation for this zone + species
    const { data: correlation, error: corrError } = await supabase
      .from('zone_threat_correlations')
      .select('*')
      .eq('zone_id', zone_id)
      .eq('species', species)
      .single()

    if (corrError || !correlation) {
      return new Response(
        JSON.stringify({ created_alert: false, reason: 'No correlation data for this zone/species' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Only proceed if correlation >= 40%
    if (correlation.correlation_pct < 40) {
      return new Response(
        JSON.stringify({ created_alert: false, reason: 'Correlation below threshold' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Call Gemini to generate predictive narrative
    const geminiKey = Deno.env.get('GEMINI_API_KEY')!
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are a wildlife crime prediction analyst. You generate predictive threat intelligence briefings based on animal movement data and historical incident correlations. Write exactly one paragraph. Start with the animal ID and zone. State the historical correlation statistic precisely. Describe the elevated risk window (48 hours). End with a specific recommended action. Use the tone of an intelligence brief: precise, direct, no filler. No hedging. Maximum 120 words.`
            }]
          },
          contents: [{
            parts: [{
              text: JSON.stringify({
                animal_id,
                species,
                zone_id,
                sighting_time: new Date().toISOString(),
                correlation_pct: correlation.correlation_pct,
                incidents_near_sightings: correlation.incident_count_near_sighting,
                total_sightings: correlation.total_sightings,
              })
            }]
          }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 200 }
        })
      }
    )

    const geminiData = await geminiResponse.json()
    const narrative = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? 
      `${species} ${animal_id} confirmed in ${zone_id}. Historical correlation: ${correlation.correlation_pct}% of sightings preceded poaching attempts within 48 hours. Increase patrol frequency in ${zone_id} immediately.`

    // Step 5: Insert PREDICTIVE alert into alerts table
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .insert({
        zone_id,
        severity: 'PREDICTIVE',
        source_type: 'WILDLIFE_CORRELATION',
        description: `Predictive threat: ${species} ${animal_id} confirmed in ${zone_id}. Historical correlation: ${correlation.correlation_pct}% of sightings preceded poaching attempts.`,
        confidence: correlation.correlation_pct,
        narrative,
        narrative_generated_at: new Date().toISOString(),
        metadata: {
          animal_id,
          species,
          correlation_pct: correlation.correlation_pct,
          sighting_id: sighting.id,
        }
      })
      .select()
      .single()

    if (alertError) throw alertError

    return new Response(
      JSON.stringify({ created_alert: true, alert }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
