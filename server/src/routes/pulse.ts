// =============================================================================
// PULSE ROUTES - Main Location Analysis Endpoint
// Uses FREE data sources: FBI Crime Data, OpenStreetMap, Nominatim
// =============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler.js';
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { calculateSafetyScore, getCountyCrimeDataByName, getAllGeorgiaCounties } from '../services/fbi-crime.js';
import { fetchAmenitiesInRadius, fetchTransitStops, calculateAmenitiesScore } from '../services/osm-amenities.js';
import { fetchFoursquarePOIs } from '../services/foursquare.js';
import { calculateMobilityScoresFromPOIs, calculateBikeScore } from '../services/walkability.js';
import { getTransitMobilityScores } from '../services/transit.js';
import { findTransitStopsNearby } from '../data/georgia-transit-data.js';
import { geocode, reverseGeocode, searchPlaces } from '../services/nominatim.js';
import { calculateVibeScore, WEIGHT_PRESETS } from '../services/vibe.js';
import { safeDbOperation } from '../lib/prisma.js';
import type { LocationPulse, SafetyScore, MobilityScores, AmenitiesScore, VibeFactors, Location } from '../types.js';

const router = Router();

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const intentEnum = z.enum(['moving_family', 'moving_single', 'visiting', 'driving_through', 'investment', 'curious']);

const pulseByCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  weights: z.object({
    safetyWeight: z.number().min(0).max(1).optional(),
    walkabilityWeight: z.number().min(0).max(1).optional(),
    transitWeight: z.number().min(0).max(1).optional(),
    amenitiesWeight: z.number().min(0).max(1).optional(),
  }).optional(),
  weightPreset: z.enum(['balanced', 'safety_first', 'urban_explorer', 'commuter', 'foodie']).optional(),
  intent: intentEnum.optional(),
});

const pulseByAddressSchema = z.object({
  address: z.string().min(1),
  weights: z.object({
    safetyWeight: z.number().min(0).max(1).optional(),
    walkabilityWeight: z.number().min(0).max(1).optional(),
    transitWeight: z.number().min(0).max(1).optional(),
    amenitiesWeight: z.number().min(0).max(1).optional(),
  }).optional(),
  weightPreset: z.enum(['balanced', 'safety_first', 'urban_explorer', 'commuter', 'foodie']).optional(),
  intent: intentEnum.optional(),
});

// -----------------------------------------------------------------------------
// Cache Settings
// -----------------------------------------------------------------------------

const CACHE_TTL_HOURS = 24;

async function getCachedPulse(zipCode: string): Promise<LocationPulse | null> {
  const cached = await safeDbOperation(async (prisma) => {
    return prisma.pulseCache.findUnique({
      where: { zipCode },
    });
  });

  if (!cached || !cached.pulseData) {
    return null;
  }

  // Check if cache is still valid
  const cacheAge = Date.now() - cached.updatedAt.getTime();
  const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000;

  if (cacheAge > maxAge) {
    return null;
  }

  try {
    return JSON.parse(cached.pulseData) as LocationPulse;
  } catch {
    return null;
  }
}

async function cachePulse(zipCode: string, lat: number, lng: number, pulse: LocationPulse): Promise<void> {
  await safeDbOperation(async (prisma) => {
    return prisma.pulseCache.upsert({
      where: { zipCode },
      update: {
        pulseData: JSON.stringify(pulse),
        lat,
        lng,
      },
      create: {
        zipCode,
        lat,
        lng,
        pulseData: JSON.stringify(pulse),
      },
    });
  });
}

// -----------------------------------------------------------------------------
// Get Safety Score – Static data → fallback to national averages
// Uses static georgia-crime-data.ts for serverless compatibility
// -----------------------------------------------------------------------------

function getSafetyScoreForLocation(countyName: string): SafetyScore {
  const cleanName = countyName.replace(' County', '').trim();

  // Use static crime data from georgia-crime-data.ts
  const crimeData = getCountyCrimeDataByName(cleanName);

  if (crimeData) {
    return calculateSafetyScore(crimeData.rates);
  }

  console.warn(`No crime data for county: "${cleanName}" – using national averages`);
  return getDefaultSafetyScore();
}

function getDefaultSafetyScore(): SafetyScore {
  // National averages (FBI 2022) – every metric scores exactly 50
  // when the local rate equals the national rate.  vsNational is 0 by definition.
  return {
    overall: 50,
    grade: 'C',
    riskLevel: 'moderate',
    trend: 'stable',
    vsNational: 0,
    crimeRates: {
      violent: 380.7,
      property: 1954.4,
      total: 380.7 + 1954.4,
    },
    breakdown: {
      murder: 50,
      robbery: 50,
      assault: 50,
      burglary: 50,
      theft: 50,
      vehicleTheft: 50,
    },
    dataSource: 'National averages (county data unavailable)',
    lastUpdated: new Date().toISOString(),
  };
}

function scoreToRiskLevel(score: number): SafetyScore['riskLevel'] {
  if (score >= 80) return 'very_low';
  if (score >= 65) return 'low';
  if (score >= 45) return 'moderate';
  if (score >= 25) return 'high';
  return 'very_high';
}

function rateToScore(rate: number, national: number): number {
  if (rate <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - (rate / national) * 50)));
}

function calculateVsNational(violent: number | null, property: number | null): number {
  const nationalTotal = 380.7 + 1954.4;
  const localTotal = (violent || 0) + (property || 0);
  return Math.round(((localTotal - nationalTotal) / nationalTotal) * 100);
}

// -----------------------------------------------------------------------------
// POST /api/pulse/analyze - Analyze by coordinates
// -----------------------------------------------------------------------------

router.post('/analyze', optionalAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validation = pulseByCoordinatesSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { lat, lng, weights, weightPreset, intent } = validation.data;

    // Determine weights to use
    const effectiveWeights: Partial<VibeFactors> = weightPreset
      ? WEIGHT_PRESETS[weightPreset]
      : weights || {};

    // Reverse geocode to get address info
    const geoResult = await reverseGeocode(lat, lng);

    if (!geoResult) {
      throw ApiError.badRequest('Could not determine location for these coordinates. This service currently covers Georgia, USA.');
    }

    // Check if in Georgia
    if (geoResult.address.state !== 'Georgia') {
      throw ApiError.badRequest('This service currently only covers Georgia, USA.');
    }

    const zipCode = geoResult.address.postcode || 'unknown';
    const countyName = geoResult.address.county || 'Unknown';

    // Check cache
    if (zipCode !== 'unknown') {
      const cached = await getCachedPulse(zipCode);
      if (cached) {
        console.log('Returning cached pulse for ZIP:', zipCode);
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }
    }

    // Fetch all data in parallel
    console.log('Fetching fresh data for coordinates:', { lat, lng, county: countyName });
    const startTime = Date.now();

    // Get safety score from static data (sync)
    const safetyScore = getSafetyScoreForLocation(countyName);

    // Run Foursquare and transit in parallel.
    // Foursquare returns null when not configured or rate-limited; we fall
    // back to Overpass only in that case.
    const [foursquarePOIs, transitStops] = await Promise.all([
      fetchFoursquarePOIs(lat, lng, 8047),   // 5 miles
      fetchTransitStops(lat, lng, 1609),
    ]);

    let amenities: any[];
    let amenitySource: string;
    if (foursquarePOIs && foursquarePOIs.length > 0) {
      amenities     = foursquarePOIs;
      amenitySource = 'Foursquare';
    } else if (foursquarePOIs === null) {
      // Not configured or rate-limited – try Overpass
      amenities     = await fetchAmenitiesInRadius(lat, lng, 8047);
      amenitySource = 'OpenStreetMap';
    } else {
      // Foursquare was called but returned 0 results – trust that, skip Overpass
      amenities     = [];
      amenitySource = 'Foursquare';
    }

    // Score calculations use 1-mile subset so scores stay accurate
    const amenitiesNear = amenities.filter((p: any) => (p.distance || 0) <= 1);
    const mobilityScores = calculateMobilityScoresFromPOIs(amenitiesNear, transitStops);
    const amenitiesScore = calculateAmenitiesScore(amenitiesNear);

    // Fallback: when transit query fails, use static GTFS transit data
    let staticTransitPOIs: any[] = [];
    if (transitStops.length === 0) {
      console.log('Transit empty – falling back to static GTFS data');
      const staticStops = findTransitStopsNearby(lat, lng, 1);
      staticTransitPOIs = staticStops.map(s => ({
        id: s.id,
        name: s.name,
        category: 'transit',
        subcategory: s.type === 'rail' ? 'station' : s.type === 'streetcar' ? 'tram_stop' : 'bus_stop',
        coordinates: { lat: s.lat, lng: s.lng },
        distance: haversineDistance(lat, lng, s.lat, s.lng),
      }));
      const staticTransit = getTransitMobilityScores(lat, lng);
      mobilityScores.transitScore = staticTransit;
      const newBike = calculateBikeScore(mobilityScores.walkScore.score, staticTransit.score);
      mobilityScores.bikeScore = { score: newBike, description: getBikeScoreDescription(newBike) };
    }

    console.log(`Data fetching completed in ${Date.now() - startTime}ms (amenities from ${amenitySource})`);

    // Calculate vibe score (pass POIs for data-driven insights)
    const allPOIs = [...amenities, ...staticTransitPOIs].filter(p => p.category !== 'transit');
    const vibeScore = await calculateVibeScore(
      safetyScore,
      mobilityScores,
      amenitiesScore,
      effectiveWeights,
      allPOIs,
      intent,
      { city: geoResult.address.city || geoResult.address.town || 'Unknown', county: countyName.replace(' County', ''), zipCode }
    );

    // Build location object
    const location: Location = {
      placeId: `ga-${zipCode}`,
      formattedAddress: geoResult.displayName,
      coordinates: { lat, lng },
      city: geoResult.address.city || geoResult.address.town || 'Unknown',
      state: 'Georgia',
      zipCode,
      country: 'USA',
      county: countyName.replace(' County', ''),
    };

    // Build the pulse response
    const pulse: LocationPulse = {
      id: `pulse_${Date.now()}`,
      location,
      analyzedAt: new Date(),
      safetyScore,
      mobilityScores,
      amenitiesScore,
      vibeScore,
      pois: [...amenities, ...staticTransitPOIs].sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)).slice(0, 100),
      dataQuality: determineDataQuality(safetyScore, mobilityScores, amenitiesScore),
      dataSources: [
        { name: 'FBI Crime Data Explorer', lastUpdated: safetyScore.lastUpdated, coverage: 'county' },
        { name: amenitySource,            lastUpdated: mobilityScores.lastUpdated, coverage: 'full' },
        { name: amenitySource,            lastUpdated: amenitiesScore.lastUpdated, coverage: 'full' },
      ],
    };

    // Cache the result – only when we actually got amenity data (but not with AI insights since they vary by intent)
    if (zipCode !== 'unknown' && amenities.length > 0 && !intent) {
      await cachePulse(zipCode, lat, lng, pulse);
    }

    // Log search if user is authenticated (optional - database may not be available)
    if (req.user) {
      await safeDbOperation(async (prisma) => {
        return prisma.searchHistory.create({
          data: {
            userId: req.user!.userId,
            query: `${lat}, ${lng}`,
            address: geoResult.displayName,
            city: location.city,
            county: countyName,
            zipCode,
            lat,
            lng,
          },
        });
      });
    }

    res.json({
      success: true,
      data: pulse,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// POST /api/pulse/analyze-address - Analyze by address string
// -----------------------------------------------------------------------------

router.post('/analyze-address', optionalAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validation = pulseByAddressSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { address, weights, weightPreset, intent } = validation.data;

    // Determine weights to use
    const effectiveWeights: Partial<VibeFactors> = weightPreset
      ? WEIGHT_PRESETS[weightPreset]
      : weights || {};

    // Geocode the address
    const geoResult = await geocode(address, true); // Limit to Georgia

    if (!geoResult) {
      throw ApiError.notFound('Address not found. This service currently covers Georgia, USA.');
    }

    const { lat, lng } = geoResult;
    const zipCode = geoResult.address.postcode || 'unknown';
    const countyName = geoResult.address.county || 'Unknown';

    // Check cache
    if (zipCode !== 'unknown') {
      const cached = await getCachedPulse(zipCode);
      if (cached) {
        // Update location to match searched address
        cached.location.formattedAddress = geoResult.displayName;
        console.log('Returning cached pulse for ZIP:', zipCode);
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }
    }

    // Fetch all data in parallel
    console.log('Fetching fresh data for address:', address);
    const startTime = Date.now();

    // Get safety score from static data (sync)
    const safetyScore = getSafetyScoreForLocation(countyName);

    // Run Foursquare and transit in parallel.
    // Foursquare returns null when not configured or rate-limited; we fall
    // back to Overpass only in that case.
    const [foursquarePOIs, transitStops] = await Promise.all([
      fetchFoursquarePOIs(lat, lng, 8047),   // 5 miles
      fetchTransitStops(lat, lng, 1609),
    ]);

    let amenities: any[];
    let amenitySource: string;
    if (foursquarePOIs && foursquarePOIs.length > 0) {
      amenities     = foursquarePOIs;
      amenitySource = 'Foursquare';
    } else if (foursquarePOIs === null) {
      // Not configured or rate-limited – try Overpass
      amenities     = await fetchAmenitiesInRadius(lat, lng, 8047);
      amenitySource = 'OpenStreetMap';
    } else {
      // Foursquare was called but returned 0 results – trust that, skip Overpass
      amenities     = [];
      amenitySource = 'Foursquare';
    }

    // Score calculations use 1-mile subset so scores stay accurate
    const amenitiesNear = amenities.filter((p: any) => (p.distance || 0) <= 1);
    const mobilityScores = calculateMobilityScoresFromPOIs(amenitiesNear, transitStops);
    const amenitiesScore = calculateAmenitiesScore(amenitiesNear);

    // Fallback: when transit query fails, use static GTFS transit data
    let staticTransitPOIs: any[] = [];
    if (transitStops.length === 0) {
      console.log('Transit empty – falling back to static GTFS data');
      const staticStops = findTransitStopsNearby(lat, lng, 1);
      staticTransitPOIs = staticStops.map(s => ({
        id: s.id,
        name: s.name,
        category: 'transit',
        subcategory: s.type === 'rail' ? 'station' : s.type === 'streetcar' ? 'tram_stop' : 'bus_stop',
        coordinates: { lat: s.lat, lng: s.lng },
        distance: haversineDistance(lat, lng, s.lat, s.lng),
      }));
      const staticTransit = getTransitMobilityScores(lat, lng);
      mobilityScores.transitScore = staticTransit;
      const newBike = calculateBikeScore(mobilityScores.walkScore.score, staticTransit.score);
      mobilityScores.bikeScore = { score: newBike, description: getBikeScoreDescription(newBike) };
    }

    console.log(`Data fetching completed in ${Date.now() - startTime}ms (amenities from ${amenitySource})`);

    // Calculate vibe score (pass POIs for data-driven insights)
    const allPOIs = [...amenities, ...staticTransitPOIs].filter(p => p.category !== 'transit');
    const vibeScore = await calculateVibeScore(
      safetyScore,
      mobilityScores,
      amenitiesScore,
      effectiveWeights,
      allPOIs,
      intent,
      { city: geoResult.address.city || geoResult.address.town || 'Unknown', county: countyName.replace(' County', ''), zipCode }
    );

    // Build location object
    const location: Location = {
      placeId: `ga-${zipCode}`,
      formattedAddress: geoResult.displayName,
      coordinates: { lat, lng },
      city: geoResult.address.city || geoResult.address.town || 'Unknown',
      state: 'Georgia',
      zipCode,
      country: 'USA',
      county: countyName.replace(' County', ''),
    };

    // Build the pulse response
    const pulse: LocationPulse = {
      id: `pulse_${Date.now()}`,
      location,
      analyzedAt: new Date(),
      safetyScore,
      mobilityScores,
      amenitiesScore,
      vibeScore,
      pois: [...amenities, ...staticTransitPOIs].sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)).slice(0, 100),
      dataQuality: determineDataQuality(safetyScore, mobilityScores, amenitiesScore),
      dataSources: [
        { name: 'FBI Crime Data Explorer', lastUpdated: safetyScore.lastUpdated, coverage: 'county' },
        { name: amenitySource,            lastUpdated: mobilityScores.lastUpdated, coverage: 'full' },
        { name: amenitySource,            lastUpdated: amenitiesScore.lastUpdated, coverage: 'full' },
      ],
    };

    // Cache the result – only when we actually got amenity data (but not with AI insights since they vary by intent)
    if (zipCode !== 'unknown' && amenities.length > 0 && !intent) {
      await cachePulse(zipCode, lat, lng, pulse);
    }

    // Log search if user is authenticated (optional - database may not be available)
    if (req.user) {
      await safeDbOperation(async (prisma) => {
        return prisma.searchHistory.create({
          data: {
            userId: req.user!.userId,
            query: address,
            address: geoResult.displayName,
            city: location.city,
            county: countyName,
            zipCode,
            lat,
            lng,
          },
        });
      });
    }

    res.json({
      success: true,
      data: pulse,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// GET /api/pulse/autocomplete - Search suggestions (Nominatim)
// -----------------------------------------------------------------------------

router.get('/autocomplete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const results = await searchPlaces(query, true, 5); // Limit to Georgia

    res.json({
      success: true,
      data: results.map(r => ({
        placeId: r.placeId,
        description: r.displayName,
        mainText: r.mainText,
        secondaryText: r.secondaryText,
        lat: r.lat,
        lng: r.lng,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// GET /api/pulse/weight-presets - Get available weight presets
// -----------------------------------------------------------------------------

router.get('/weight-presets', (_req: Request, res: Response) => {
  const presets = Object.entries(WEIGHT_PRESETS).map(([name, weights]) => ({
    name,
    label: formatPresetName(name),
    description: getPresetDescription(name),
    weights,
  }));

  res.json({
    success: true,
    data: presets,
  });
});

// -----------------------------------------------------------------------------
// GET /api/pulse/georgia-coverage - Get coverage info
// Uses static data - database not required
// -----------------------------------------------------------------------------

router.get('/georgia-coverage', (_req: Request, res: Response) => {
  // Get county count from static crime data
  const counties = getAllGeorgiaCounties();

  res.json({
    success: true,
    data: {
      state: 'Georgia',
      counties: counties.length,
      countiesWithCrimeData: counties.length,
      cities: 'N/A (real-time geocoding)',
      zipCodes: 'N/A (real-time geocoding)',
      dataSources: [
        { name: 'FBI Crime Data Explorer', type: 'crime', coverage: 'county-level' },
        { name: 'Foursquare Places API', type: 'amenities', coverage: 'real-time' },
        { name: 'OpenStreetMap (fallback)', type: 'amenities', coverage: 'real-time' },
        { name: 'Nominatim', type: 'geocoding', coverage: 'real-time' },
      ],
    },
  });
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function determineDataQuality(
  _safety: SafetyScore,
  mobility: MobilityScores,
  amenities: AmenitiesScore
): 'complete' | 'partial' | 'limited' {
  let quality = 0;

  if (_safety.overall > 0) quality++;
  if (mobility.walkScore.score >= 0) quality++;
  if (amenities.highlights.totalPOIs > 0) quality++;

  if (quality >= 3) return 'complete';
  if (quality >= 2) return 'partial';
  return 'limited';
}

function formatPresetName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

function getBikeScoreDescription(score: number): string {
  if (score >= 90) return "Biker's Paradise";
  if (score >= 70) return 'Very Bikeable';
  if (score >= 50) return 'Bikeable';
  if (score >= 25) return 'Somewhat Bikeable';
  return 'Minimal Bike Infrastructure';
}

function getPresetDescription(name: string): string {
  const descriptions: Record<string, string> = {
    balanced: 'Equal weight to all factors',
    safety_first: 'Prioritizes low crime and safety',
    urban_explorer: 'Focuses on walkability and transit',
    commuter: 'Emphasizes public transit access',
    foodie: 'Values restaurants and amenities',
  };
  return descriptions[name] || '';
}

export { router as pulseRouter };
