// =============================================================================
// NOMINATIM GEOCODING SERVICE (Free, OpenStreetMap-based)
// =============================================================================
// Converts addresses to coordinates and vice versa
// API Docs: https://nominatim.org/release-docs/latest/api/Overview/
// Usage Policy: Max 1 request/second, include User-Agent

import axios from 'axios';

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'CityPulse/1.0 (https://citypulse.app)';

// Rate limiting - max 1 request per second
let lastRequestTime = 0;
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address: {
    houseNumber?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  boundingBox?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  osmId?: number;
  osmType?: string;
}

export interface AutocompleteResult {
  placeId: string;
  displayName: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
  type: string;
}

/**
 * Geocode an address string to coordinates
 */
export async function geocode(
  address: string,
  limitToGeorgia: boolean = true
): Promise<GeocodingResult | null> {
  await rateLimit();

  try {
    const params: Record<string, string> = {
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '1',
    };

    // Limit to Georgia if specified
    if (limitToGeorgia) {
      params.countrycodes = 'us';
      params.viewbox = '-85.605165,30.355757,-80.839729,35.000659'; // Georgia bounding box
      params.bounded = '1';
    }

    const response = await axios.get(`${NOMINATIM_API}/search`, {
      params,
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const result = response.data[0];
    const addr = result.address || {};

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        houseNumber: addr.house_number,
        road: addr.road,
        city: addr.city || addr.town || addr.village,
        county: addr.county,
        state: addr.state,
        postcode: addr.postcode,
        country: addr.country,
      },
      boundingBox: result.boundingbox ? {
        south: parseFloat(result.boundingbox[0]),
        north: parseFloat(result.boundingbox[1]),
        west: parseFloat(result.boundingbox[2]),
        east: parseFloat(result.boundingbox[3]),
      } : undefined,
      osmId: result.osm_id,
      osmType: result.osm_type,
    };
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  await rateLimit();

  try {
    const response = await axios.get(`${NOMINATIM_API}/reverse`, {
      params: {
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    if (!response.data || response.data.error) {
      return null;
    }

    const result = response.data;
    const addr = result.address || {};

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        houseNumber: addr.house_number,
        road: addr.road,
        city: addr.city || addr.town || addr.village,
        county: addr.county,
        state: addr.state,
        postcode: addr.postcode,
        country: addr.country,
      },
      osmId: result.osm_id,
      osmType: result.osm_type,
    };
  } catch (error) {
    console.error('Nominatim reverse geocoding error:', error);
    return null;
  }
}

/**
 * Search for places (autocomplete-style)
 */
export async function searchPlaces(
  query: string,
  limitToGeorgia: boolean = true,
  limit: number = 5
): Promise<AutocompleteResult[]> {
  await rateLimit();

  try {
    const params: Record<string, string> = {
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: limit.toString(),
    };

    // Limit to Georgia
    if (limitToGeorgia) {
      params.countrycodes = 'us';
      params.viewbox = '-85.605165,30.355757,-80.839729,35.000659';
      params.bounded = '1';
    }

    const response = await axios.get(`${NOMINATIM_API}/search`, {
      params,
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((result: any) => {
      const addr = result.address || {};
      const city = addr.city || addr.town || addr.village || '';
      const state = addr.state || 'Georgia';

      // Build main text (street address or place name)
      let mainText = '';
      if (addr.house_number && addr.road) {
        mainText = `${addr.house_number} ${addr.road}`;
      } else if (addr.road) {
        mainText = addr.road;
      } else if (result.name) {
        mainText = result.name;
      } else {
        mainText = city || result.display_name.split(',')[0];
      }

      // Build secondary text
      const secondaryText = [city, state, addr.postcode]
        .filter(Boolean)
        .join(', ');

      return {
        placeId: `osm-${result.osm_type}-${result.osm_id}`,
        displayName: result.display_name,
        mainText,
        secondaryText,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        type: result.type || result.class || 'address',
      };
    });
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
}

/**
 * Get ZIP code for coordinates
 */
export async function getZipCode(lat: number, lng: number): Promise<string | null> {
  const result = await reverseGeocode(lat, lng);
  return result?.address.postcode || null;
}

/**
 * Get county for coordinates
 */
export async function getCounty(lat: number, lng: number): Promise<string | null> {
  const result = await reverseGeocode(lat, lng);
  if (result?.address.county) {
    // Remove " County" suffix if present
    return result.address.county.replace(' County', '');
  }
  return null;
}

export default {
  geocode,
  reverseGeocode,
  searchPlaces,
  getZipCode,
  getCounty,
};
