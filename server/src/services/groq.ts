// =============================================================================
// GROQ AI SERVICE
// Free tier: 30k tokens/min, no credit card required
// Model: llama-3.3-70b-versatile (recommended)
// Docs: https://console.groq.com/docs
// =============================================================================

import axios from 'axios';
import type { SafetyScore, MobilityScores, AmenitiesScore, SearchIntent } from '../types.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// Lazy getter for API key (env vars loaded after module imports)
const getApiKey = () => process.env.GROQ_API_KEY || '';

// -----------------------------------------------------------------------------
// Intent-specific system prompts
// -----------------------------------------------------------------------------

const INTENT_PROMPTS: Record<SearchIntent, string> = {
  moving_family: `The user is a FAMILY considering moving to this area. Focus on:
- School quality and proximity (mention any schools nearby)
- Safety for children (parks with playgrounds, sidewalks, crime rates)
- Family-friendly amenities (pediatricians, childcare, family restaurants)
- Neighborhood stability and community feel
- Grocery stores for family shopping
- Healthcare access (urgent care, hospitals)`,

  moving_single: `The user is a SINGLE PROFESSIONAL considering moving here. Focus on:
- Nightlife and social scene (bars, restaurants, cafes for meeting people)
- Walkability and transit for car-free living
- Fitness options (gyms, yoga studios, running paths, parks)
- Dating scene and social opportunities
- Coffee shops and coworking-friendly spots
- Proximity to entertainment and dining variety`,

  visiting: `The user is a TOURIST/VISITOR planning a trip. Focus on:
- Restaurant and dining options (variety, quality, unique local spots)
- Entertainment and attractions
- Safety for tourists (especially at night, in unfamiliar areas)
- Public transit for getting around without a car
- Unique local experiences and things to do
- Walkability for exploring on foot`,

  driving_through: `The user is DRIVING THROUGH this area. Focus on:
- Gas station availability
- Fast food and quick dining options
- Rest stops and convenience stores
- Safety of the area (especially at night)
- Easy highway access
- Quick amenities (bathrooms, coffee)`,

  investment: `The user is evaluating this area for INVESTMENT PROPERTY. Focus on:
- Safety trends and crime trajectory (is it improving or declining?)
- School quality (strongly affects property values)
- Development and growth indicators
- Transit access improvements
- Amenity density (walkability drives property value)
- Overall neighborhood quality score`,

  curious: `The user is JUST CURIOUS about this neighborhood. Provide a balanced overview:
- Overall livability summary
- Key strengths of the area
- Key weaknesses or considerations
- Who would love this area (ideal resident profile)
- Who might want to look elsewhere
- Notable unique features`,
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GroqInsightsResult {
  pros: string[];
  cons: string[];
  summary?: string;
}

export interface LocationContext {
  city: string;
  county: string;
  zipCode: string;
}

// -----------------------------------------------------------------------------
// Helper: Build POI summary by category
// -----------------------------------------------------------------------------

function buildPOISummary(pois: any[]): string {
  const categories: Record<string, { count: number; examples: string[] }> = {};

  for (const poi of pois.slice(0, 100)) {
    const cat = poi.category || 'other';
    if (!categories[cat]) {
      categories[cat] = { count: 0, examples: [] };
    }
    categories[cat].count++;
    if (categories[cat].examples.length < 3 && poi.name) {
      categories[cat].examples.push(poi.name);
    }
  }

  if (Object.keys(categories).length === 0) {
    return '- No POI data available';
  }

  return Object.entries(categories)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([cat, data]) => {
      const examples = data.examples.length > 0
        ? ` (e.g., ${data.examples.join(', ')})`
        : '';
      return `- ${cat}: ${data.count}${examples}`;
    })
    .join('\n');
}

// -----------------------------------------------------------------------------
// Helper: Build data context for the AI
// -----------------------------------------------------------------------------

function buildDataContext(
  safety: SafetyScore,
  mobility: MobilityScores,
  amenities: AmenitiesScore,
  pois: any[],
  location: LocationContext
): string {
  const poiSummary = buildPOISummary(pois);

  return `
LOCATION: ${location.city}, ${location.county} County (ZIP: ${location.zipCode})

SAFETY DATA:
- Overall Safety Score: ${safety.overall}/100 (Grade: ${safety.grade})
- Risk Level: ${safety.riskLevel}
- vs National Average: ${safety.vsNational > 0 ? '+' : ''}${safety.vsNational}%
- Violent Crime Rate: ${safety.crimeRates.violent.toFixed(1)} per 100k
- Property Crime Rate: ${safety.crimeRates.property.toFixed(1)} per 100k
- Crime Trend: ${safety.trend}
- Breakdown: Murder ${safety.breakdown.murder}/100, Robbery ${safety.breakdown.robbery}/100, Assault ${safety.breakdown.assault}/100, Burglary ${safety.breakdown.burglary}/100, Theft ${safety.breakdown.theft}/100

MOBILITY DATA:
- Walk Score: ${mobility.walkScore.score}/100 (${mobility.walkScore.description})
- Transit Score: ${mobility.transitScore.score}/100 (${mobility.transitScore.description})
- Bike Score: ${mobility.bikeScore.score}/100 (${mobility.bikeScore.description})

AMENITIES DATA:
- Overall Amenities Score: ${amenities.overall}/100
- Food Desert: ${amenities.isFoodDesert ? 'YES - Limited grocery access within 1 mile' : 'No'}
- Total Points of Interest: ${amenities.highlights?.totalPOIs || 0}
- Grocery Stores: ${amenities.highlights?.groceryStores || 0}
- Restaurants: ${amenities.highlights?.restaurants || 0}
- Healthcare Facilities: ${amenities.highlights?.healthcare || 0}
- Parks: ${amenities.highlights?.parks || 0}
- Gyms/Fitness: ${amenities.highlights?.gyms || 0}

NEARBY PLACES BY CATEGORY:
${poiSummary}
`.trim();
}

// -----------------------------------------------------------------------------
// Main function: Generate AI insights
// -----------------------------------------------------------------------------

/**
 * Generate personalized insights using Groq AI.
 * Returns null if not configured or on error (caller should fallback to rule-based).
 */
export async function generateAIInsights(
  intent: SearchIntent,
  safety: SafetyScore,
  mobility: MobilityScores,
  amenities: AmenitiesScore,
  pois: any[],
  location: LocationContext
): Promise<GroqInsightsResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('Groq API key not configured, using rule-based insights');
    return null;
  }

  const dataContext = buildDataContext(safety, mobility, amenities, pois, location);

  const systemPrompt = `You are a neighborhood analyst for CityPulse, a location intelligence app. Generate personalized insights based on the user's specific intent and the provided data.

${INTENT_PROMPTS[intent]}

RESPONSE FORMAT:
Return a JSON object with exactly this structure:
{
  "pros": ["specific highlight 1", "specific highlight 2", "specific highlight 3"],
  "cons": ["specific consideration 1", "specific consideration 2"],
  "summary": "One personalized sentence summary for this user type"
}

RULES:
1. Use SPECIFIC data from the context (mention actual numbers, scores, business names)
2. Tailor every insight to the user's stated intent - what matters to THEM
3. Be concise but specific (max 15 words per bullet)
4. Include 3-5 pros and 2-4 cons
5. Never invent data not provided - only use what's in the context
6. If data is limited, acknowledge it honestly
7. Make the summary actionable and personalized to the intent`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dataContext },
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('Groq returned empty content, falling back');
      return null;
    }

    const parsed = JSON.parse(content) as GroqInsightsResult;

    // Validate response structure
    if (!Array.isArray(parsed.pros) || !Array.isArray(parsed.cons)) {
      console.warn('Groq returned invalid structure, falling back');
      return null;
    }

    // Ensure minimum items
    if (parsed.pros.length < 2 || parsed.cons.length < 1) {
      console.warn('Groq returned too few insights, falling back');
      return null;
    }

    console.log(`Groq AI insights generated successfully for intent: ${intent}`);
    return parsed;

  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: any }; message?: string };

    if (err.response?.status === 401) {
      console.error('Groq: 401 - API key is invalid');
    } else if (err.response?.status === 429) {
      console.warn('Groq: Rate limited (429), falling back to rule-based');
    } else if (err.response?.status === 400) {
      console.error('Groq: Bad request -', err.response?.data?.error?.message || 'unknown');
    } else {
      console.error('Groq API error:', err.message || error);
    }

    return null; // Caller will use fallback
  }
}

// -----------------------------------------------------------------------------
// Utility: Check if Groq is configured
// -----------------------------------------------------------------------------

export function isGroqConfigured(): boolean {
  return !!getApiKey();
}
