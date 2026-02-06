// =============================================================================
// FOURSQUARE PLACES API SERVICE
// =============================================================================
// Free tier: 10,000 Pro calls / month. We self-cap at 300 calls/day (~9k/mo).
// Each location uses 8 API calls (one per query group) = ~37 locations/day.
// With 24h ZIP code caching, actual usage is much lower in practice.
// Pro fields include name, location, categories, phone, website.
// Premium fields (ratings, hours, photos) are NOT requested.
// Auth: Authorization: Bearer <SERVICE_KEY>  +  X-Places-Api-Version header.
// Docs: https://docs.foursquare.com/fsq-developers-places/reference/migration-guide
// =============================================================================

import axios from 'axios';

// Lazy getter for API key (env vars loaded after module imports in index.ts)
const getApiKey = () => process.env.FOURSQUARE_API_KEY || '';

const BASE_URL    = 'https://places-api.foursquare.com/places/search';
const API_VERSION = '2025-06-17';

// -----------------------------------------------------------------------------
// Daily rate-limit guard
// -----------------------------------------------------------------------------
// Resets at midnight UTC.  Module-level state is fine because the server is
// single-process; a restart resets the counter, which errs on the side of
// allowing more calls — acceptable for a 10 k/month budget.

const DAILY_LIMIT = 300;
let callsToday = 0;
let currentDateStr = '';  // YYYY-MM-DD (UTC)

function resetIfNewDay() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== currentDateStr) {
    callsToday = 0;
    currentDateStr = today;
  }
}

// -----------------------------------------------------------------------------
// Query-based category fetching
// -----------------------------------------------------------------------------
// The migrated Places API ignores the old v2 category IDs. Instead, we use
// the `query` text parameter with targeted search terms. Each query returns
// up to 50 results, so we group related categories to maximize coverage.
// 8 queries × 50 results = ~400 POIs per location (vs 50 with broken category IDs).

const QUERY_GROUPS = [
  { query: 'restaurant dining food', label: 'restaurants' },
  { query: 'cafe coffee bakery', label: 'cafes' },
  { query: 'bar pub brewery nightlife', label: 'bars' },
  { query: 'grocery supermarket market', label: 'grocery' },
  { query: 'pharmacy drugstore', label: 'pharmacy' },
  { query: 'gym fitness yoga', label: 'gyms' },
  { query: 'park playground garden', label: 'parks' },
  { query: 'bank atm', label: 'banks' },
];

// Map a Foursquare category name (returned in the response) to our POI
// category string.  Matching is done on the lowercased name so it works
// regardless of whether Foursquare returns "Restaurant" or "Italian Restaurant".
function mapCategory(categoryName: string): string {
  const n = categoryName.toLowerCase();

  if (n.includes('restaurant') || n.includes('fast food') || n.includes('food court') || n.includes('pizza') || n.includes('mexican') || n.includes('italian') || n.includes('american') || n.includes('asian') || n.includes('indian') || n.includes('thai') || n.includes('chinese') || n.includes('japanese') || n.includes('korean') || n.includes('greek') || n.includes('mediterranean') || n.includes('bbq') || n.includes('seafood') || n.includes('sandwich') || n.includes('burger') || n.includes('chicken') || n.includes('steak') || n.includes('sushi') || n.includes('taco') || n.includes('diner') || n.includes('buffet')) return 'restaurant';
  if (n.includes('cafe') || n.includes('coffee') || n.includes('bakery') || n.includes('dessert') || n.includes('ice cream') || n.includes('donut')) return 'cafe';
  if (n.includes('bar') || n.includes('pub') || n.includes('nightclub') || n.includes('lounge') || n.includes('cocktail') || n.includes('brewery') || n.includes('winery') || n.includes('whiskey')) return 'bar';
  if (n.includes('gym') || n.includes('fitness') || n.includes('yoga') || n.includes('sport') || n.includes('athletic') || n.includes('crossfit') || n.includes('pilates') || n.includes('martial art') || n.includes('boxing') || n.includes('swim') || n.includes('dance studio')) return 'gym';
  if (n.includes('grocery') || n.includes('supermarket') || n.includes('convenience') || n.includes('bodega') || n.includes('market')) return 'grocery';
  if (n.includes('park') || n.includes('garden') || n.includes('playground') || n.includes('trail') || n.includes('nature') || n.includes('botanical') || n.includes('recreation')) return 'park';
  if (n.includes('pharmacy') || n.includes('drugstore') || n.includes('walgreen') || n.includes('cvs') || n.includes('rite aid')) return 'pharmacy';
  if (n.includes('hospital') || n.includes('doctor') || n.includes('clinic') || n.includes('medical') || n.includes('health') || n.includes('dentist') || n.includes('urgent care') || n.includes('veterinar')) return 'healthcare';
  if (n.includes('school') || n.includes('university') || n.includes('college') || n.includes('education') || n.includes('high school') || n.includes('middle school') || n.includes('elementary')) return 'school';
  if (n.includes('shop') || n.includes('mall') || n.includes('store') || n.includes('boutique') || n.includes('department') || n.includes('clothing') || n.includes('jewelry') || n.includes('furniture') || n.includes('electronics') || n.includes('gift') || n.includes('toy')) return 'shopping';
  if (n.includes('bank') || n.includes('atm') || n.includes('credit union')) return 'bank';
  if (n.includes('gas') || n.includes('fuel') || n.includes('petrol')) return 'gas_station';
  if (n.includes('cinema') || n.includes('theater') || n.includes('theatre') || n.includes('museum') || n.includes('gallery') || n.includes('entertainment') || n.includes('arcade') || n.includes('bowling') || n.includes('karaoke') || n.includes('escape room') || n.includes('amusement')) return 'entertainment';

  return 'other';
}

// -----------------------------------------------------------------------------
// Main fetch function
// -----------------------------------------------------------------------------

/**
 * Fetch POIs from the Foursquare Places API.
 *
 * Return semantics (used by the caller to decide whether to fall back):
 *   null  – not configured (no key) or rate-limited → caller should try Overpass
 *   []    – API was called successfully but returned zero results
 *   [...]  – results ready to use
 */
export async function fetchFoursquarePOIs(
  lat: number,
  lng: number,
  radiusMeters: number = 8047, // 5 miles
): Promise<any[] | null> {
  if (!getApiKey()) {
    return null; // not configured – fall back to Overpass
  }

  resetIfNewDay();
  // Each location requires QUERY_GROUPS.length calls. Check if we have budget.
  const callsNeeded = QUERY_GROUPS.length;
  if (callsToday + callsNeeded > DAILY_LIMIT) {
    console.warn(`Foursquare daily limit would be exceeded (${callsToday + callsNeeded}/${DAILY_LIMIT}) – falling back to Overpass`);
    return null;
  }

  try {
    // Run all query groups in parallel
    const promises = QUERY_GROUPS.map(group =>
      axios.get(BASE_URL, {
        headers: {
          'Authorization':        `Bearer ${getApiKey()}`,
          'X-Places-Api-Version': API_VERSION,
          'Accept':               'application/json',
        },
        params: {
          ll: `${lat},${lng}`,
          radius: radiusMeters,
          query: group.query,
          limit: 50,
        },
        timeout: 15000,
      })
    );

    const responses = await Promise.all(promises);
    callsToday += callsNeeded;

    // Merge and deduplicate results by fsq_place_id
    const seenIds = new Set<string>();
    const allResults: any[] = [];

    for (const response of responses) {
      const results = response.data?.results;
      if (Array.isArray(results)) {
        for (const r of results) {
          if (r.fsq_place_id && !seenIds.has(r.fsq_place_id)) {
            seenIds.add(r.fsq_place_id);
            allResults.push(r);
          }
        }
      }
    }

    console.log(`Foursquare returned ${allResults.length} unique places (${callsToday}/${DAILY_LIMIT} calls today)`);

    // Map to POI format
    return allResults
      .filter((r: any) => r.name && r.latitude != null && r.longitude != null)
      .map((r: any) => {
        const cat      = r.categories?.[0];
        const category = cat ? mapCategory(cat.name) : 'other';

        let address: string | undefined;
        if (r.location?.address) {
          address = r.location.address;
          if (r.location.locality) address += `, ${r.location.locality}`;
        }

        return {
          id:            `fsq-${r.fsq_place_id}`,
          name:          r.name,
          category,
          subcategory:   cat?.name,
          address,
          coordinates:   { lat: r.latitude, lng: r.longitude },
          distance:      Math.round((r.distance / 1609.34) * 100) / 100, // m → miles
          rating:        undefined, // Premium field – not requested
          priceLevel:    undefined,
          phone:         r.tel || undefined,
          website:       r.website || undefined,
          openNow:       undefined, // Premium field – not requested
        };
      })
      .filter((poi: any) => poi.category !== 'other');

  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    if (err.response?.status === 401) {
      console.error('Foursquare: 401 – API key is invalid or missing permissions');
    } else {
      console.error('Foursquare API error:', err.message || error);
    }
    return null; // treat errors same as "not configured" so caller falls back
  }
}

/**
 * Expose today's usage for logging / health checks.
 */
export function getFoursquareUsage(): { callsToday: number; dailyLimit: number; configured: boolean } {
  resetIfNewDay();
  return { callsToday, dailyLimit: DAILY_LIMIT, configured: !!getApiKey() };
}
