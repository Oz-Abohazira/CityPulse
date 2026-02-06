// =============================================================================
// OPENSTREETMAP OVERPASS API SERVICE (Free, No Limits for Reasonable Use)
// =============================================================================
// Queries OpenStreetMap for amenities, shops, transit stops, etc.
// API Docs: https://wiki.openstreetmap.org/wiki/Overpass_API

import axios from 'axios';
import type { POI, AmenitiesScore } from '../types.js';

// Public Overpass API endpoints – tried in order; first success wins.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kielkonstrukt.de/api/interpreter',
  'https://overpass.catawba.us/api/interpreter',
];

// Categories that are commonly encoded as ways/relations (not just nodes).
// All other categories use node-only queries to keep payload small.
const WAY_CATEGORIES = new Set(['park', 'playground', 'school', 'university']);

// Amenity filter strings keyed by a short label.
const AMENITY_QUERIES: Record<string, string> = {
  restaurant: 'amenity=restaurant',
  fast_food: 'amenity=fast_food',
  cafe: 'amenity=cafe',
  bar: 'amenity=bar',
  pub: 'amenity=pub',
  food_court: 'amenity=food_court',
  supermarket: 'shop=supermarket',
  grocery: 'shop=convenience',
  fuel: 'amenity=fuel',
  shop_fuel: 'shop=fuel',
  variety: 'shop=variety_store',
  general: 'shop=general',
  mall: 'shop=mall',
  pharmacy: 'amenity=pharmacy',
  hospital: 'amenity=hospital',
  doctors: 'amenity=doctors',
  dentist: 'amenity=dentist',
  gym: 'leisure=fitness_centre',
  sports: 'leisure=sports_centre',
  bank: 'amenity=bank',
  atm: 'amenity=atm',
  post_office: 'amenity=post_office',
  school: 'amenity=school',
  university: 'amenity=university',
  library: 'amenity=library',
  cinema: 'amenity=cinema',
  theatre: 'amenity=theatre',
  nightclub: 'amenity=nightclub',
  park: 'leisure=park',
  playground: 'leisure=playground',
  bus_stop: 'highway=bus_stop',
  subway: 'railway=subway_entrance',
  train_station: 'railway=station',
};

/**
 * POST an Overpass query, trying mirrors in order until one succeeds.
 * Returns the parsed JSON body or throws.
 */
async function overpassPost(data: string, axiosTimeoutMs: number): Promise<any> {
  let lastError: unknown;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const response = await axios.post(url, data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: axiosTimeoutMs,
      });
      return response.data;
    } catch (err: unknown) {
      lastError = err;
      const status = (err as any)?.response?.status;
      // Only retry on server-side errors (5xx) or timeout; abort on 4xx
      if (status && status < 500) throw err;
      console.warn(`Overpass mirror ${url} failed (${status || 'timeout'}), trying next…`);
    }
  }
  throw lastError;
}

/** Build the line(s) for one amenity filter inside an Overpass union block. */
function amenityLines(label: string, filter: string, spatialClause: string): string {
  const node = `  node[${filter}]${spatialClause};`;
  if (WAY_CATEGORIES.has(label)) {
    return `${node}\n  way[${filter}]${spatialClause};`;
  }
  return node;
}

interface OSMNode {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    amenity?: string;
    shop?: string;
    leisure?: string;
    cuisine?: string;
    phone?: string;
    website?: string;
    opening_hours?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    [key: string]: string | undefined;
  };
}

// Generic fallback names generated when OSM has no name tag — these are
// sub-features (e.g. unnamed park polygons inside a named park) and not useful.
const GENERIC_NAMES = new Set([
  'Grocery', 'Restaurant', 'Pharmacy', 'Healthcare', 'Park',
  'Gym', 'Bank', 'School', 'Transit', 'Bar', 'Entertainment', 'Other',
]);

function isNamedPOI(poi: POI): boolean {
  return !GENERIC_NAMES.has(poi.name);
}

/**
 * Fetch amenities within a radius of given coordinates
 */
export async function fetchAmenitiesInRadius(
  lat: number,
  lng: number,
  radiusMeters: number = 1609 // 1 mile default
): Promise<POI[]> {
  const spatial = `(around:${radiusMeters},${lat},${lng})`;
  const queries = Object.entries(AMENITY_QUERIES)
    .map(([label, filter]) => amenityLines(label, filter, spatial))
    .join('\n');

  const overpassQuery = `[out:json][timeout:60];\n(\n${queries}\n);\nout body center;\n`;

  try {
    console.log(`Fetching amenities from Overpass API for ${lat}, ${lng} (radius: ${radiusMeters}m)`);
    const data = await overpassPost(`data=${encodeURIComponent(overpassQuery)}`, 65000);

    if (!data || !data.elements) {
      console.log('Overpass API returned no elements');
      return [];
    }

    const elements = data.elements.filter((el: OSMNode) => el.lat || el.center);
    console.log(`Found ${elements.length} amenities from Overpass API`);

    return elements.map((el: OSMNode) => osmNodeToPOI(el, lat, lng)).filter(isNamedPOI);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    console.error('Overpass API error:', err.message || error);
    if (err.response) {
      console.error('Response status:', err.response.status);
    }
    return [];
  }
}

/**
 * Fetch amenities for a bounding box (useful for ZIP code area)
 */
export async function fetchAmenitiesInBBox(
  south: number,
  west: number,
  north: number,
  east: number
): Promise<POI[]> {
  const spatial = `(${south},${west},${north},${east})`;
  const queries = Object.entries(AMENITY_QUERIES)
    .map(([label, filter]) => amenityLines(label, filter, spatial))
    .join('\n');

  const overpassQuery = `[out:json][timeout:60];\n(\n${queries}\n);\nout body center;\n`;

  try {
    const data = await overpassPost(`data=${encodeURIComponent(overpassQuery)}`, 65000);

    if (!data || !data.elements) {
      return [];
    }

    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;

    return data.elements
      .filter((el: OSMNode) => el.lat || el.center)
      .map((el: OSMNode) => osmNodeToPOI(el, centerLat, centerLng))
      .filter(isNamedPOI);
  } catch (error) {
    console.error('Overpass API error:', error);
    return [];
  }
}

/**
 * Fetch transit stops within radius
 */
export async function fetchTransitStops(
  lat: number,
  lng: number,
  radiusMeters: number = 1609
): Promise<POI[]> {
  const overpassQuery = `
[out:json][timeout:30];
(
  node[highway=bus_stop](around:${radiusMeters},${lat},${lng});
  node[railway=subway_entrance](around:${radiusMeters},${lat},${lng});
  node[railway=station](around:${radiusMeters},${lat},${lng});
  node[railway=tram_stop](around:${radiusMeters},${lat},${lng});
  node[public_transport=station](around:${radiusMeters},${lat},${lng});
  node[public_transport=stop_position](around:${radiusMeters},${lat},${lng});
);
out body;
`;

  try {
    const data = await overpassPost(`data=${encodeURIComponent(overpassQuery)}`, 35000);

    if (!data || !data.elements) {
      return [];
    }

    return data.elements
      .filter((el: OSMNode) => el.lat)
      .map((el: OSMNode) => osmNodeToPOI(el, lat, lng))
      .filter(isNamedPOI);
  } catch (error) {
    console.error('Overpass API error (transit):', error);
    return [];
  }
}

/**
 * Convert OSM node to POI format
 */
function osmNodeToPOI(node: OSMNode, refLat: number, refLng: number): POI {
  const lat = node.lat || node.center?.lat || 0;
  const lng = node.lon || node.center?.lon || 0;
  const tags = node.tags || {};

  // Determine category
  const category = determineCategory(tags);

  // Build address
  let address: string | undefined;
  if (tags['addr:street']) {
    address = tags['addr:housenumber']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'];
    if (tags['addr:city']) {
      address += `, ${tags['addr:city']}`;
    }
  }

  return {
    id: `osm-${node.id}`,
    name: tags.name || `${category.charAt(0).toUpperCase() + category.slice(1)}`,
    category: category as POI['category'],
    subcategory: tags.cuisine || tags.shop || tags.amenity || tags.leisure,
    address: address || '',
    coordinates: { lat, lng },
    distance: calculateDistance(refLat, refLng, lat, lng),
    walkingTime: Math.round((calculateDistance(refLat, refLng, lat, lng) / 80) * 60), // ~80m/min walk
    rating: undefined, // OSM doesn't have ratings
    priceLevel: undefined,
  };
}

/**
 * Determine category from OSM tags
 */
function determineCategory(tags: OSMNode['tags']): string {
  if (!tags) return 'other';

  if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food' || tags.amenity === 'cafe' || tags.amenity === 'food_court') {
    return 'restaurant';
  }
  if (tags.shop === 'supermarket' || tags.shop === 'convenience' || tags.shop === 'grocery'
      || tags.shop === 'fuel' || tags.shop === 'variety_store' || tags.shop === 'general'
      || tags.shop === 'mall' || tags.amenity === 'fuel') {
    return 'grocery';
  }
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'hospital' || tags.amenity === 'doctors' || tags.amenity === 'clinic' || tags.amenity === 'dentist') {
    return 'healthcare';
  }
  if (tags.leisure === 'fitness_centre' || tags.leisure === 'sports_centre') {
    return 'gym';
  }
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return 'bank';
  if (tags.amenity === 'school' || tags.amenity === 'university' || tags.amenity === 'library') return 'school';
  if (tags.leisure === 'park' || tags.leisure === 'playground') return 'park';
  if (tags.highway === 'bus_stop' || tags.railway || tags.public_transport) return 'transit';
  if (tags.amenity === 'bar' || tags.amenity === 'pub' || tags.amenity === 'nightclub') return 'bar';
  if (tags.amenity === 'cinema' || tags.amenity === 'theatre') return 'entertainment';

  return 'other';
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Distance in miles, 2 decimals
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate amenities score from POI data
 */
export function calculateAmenitiesScore(pois: POI[]): AmenitiesScore {
  // Count by category
  const counts: Record<string, number> = {};
  for (const poi of pois) {
    counts[poi.category] = (counts[poi.category] || 0) + 1;
  }

  // Essential amenities check
  const hasGrocery = (counts.grocery || 0) > 0;
  const hasPharmacy = (counts.pharmacy || 0) > 0;
  const hasHealthcare = (counts.healthcare || 0) > 0;
  const hasRestaurant = (counts.restaurant || 0) > 0;
  const hasBank = (counts.bank || 0) > 0;

  // Calculate sub-scores (0-100)
  const groceryScore = Math.min(100, (counts.grocery || 0) * 25); // 4+ = 100
  const diningScore = Math.min(100, (counts.restaurant || 0) * 10); // 10+ = 100
  const healthcareScore = Math.min(100, ((counts.healthcare || 0) + (counts.pharmacy || 0)) * 20);
  const entertainmentScore = Math.min(100, ((counts.park || 0) + (counts.gym || 0)) * 15);
  const shoppingScore = Math.min(100, ((counts.grocery || 0) + (counts.bank || 0)) * 20);

  // Overall score (weighted average)
  const overall = Math.round(
    groceryScore * 0.25 +
    diningScore * 0.20 +
    healthcareScore * 0.25 +
    entertainmentScore * 0.15 +
    shoppingScore * 0.15
  );

  // Food desert detection (no grocery within 1 mile)
  const isFoodDesert = !hasGrocery;

  // Nearest by category
  const nearestByCategory: AmenitiesScore['nearestByCategory'] = {};
  for (const poi of pois) {
    if (!nearestByCategory[poi.category] || poi.distance! < nearestByCategory[poi.category]!.distance!) {
      nearestByCategory[poi.category] = poi;
    }
  }

  return {
    overall,
    categories: {
      grocery: groceryScore,
      dining: diningScore,
      healthcare: healthcareScore,
      entertainment: entertainmentScore,
      shopping: shoppingScore,
    },
    highlights: {
      totalPOIs: pois.length,
      groceryStores: counts.grocery || 0,
      restaurants: counts.restaurant || 0,
      healthcare: (counts.healthcare || 0) + (counts.pharmacy || 0),
      parks: counts.park || 0,
      gyms: counts.gym || 0,
    },
    isFoodDesert,
    nearestByCategory,
    dataSource: 'OpenStreetMap',
    lastUpdated: new Date().toISOString(),
  };
}

export default {
  fetchAmenitiesInRadius,
  fetchAmenitiesInBBox,
  fetchTransitStops,
  calculateAmenitiesScore,
};
