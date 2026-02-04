// =============================================================================
// PULSE ROUTES - Main Location Analysis Endpoint
// Uses FREE data sources: FBI Crime Data, OpenStreetMap, Nominatim
// =============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler.js';
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { calculateSafetyScore, GEORGIA_COUNTIES, fetchCountyCrimeData } from '../services/fbi-crime.js';
import { fetchAmenitiesInRadius, fetchTransitStops, calculateAmenitiesScore } from '../services/osm-amenities.js';
import { calculateMobilityScoresFromPOIs } from '../services/walkability.js';
import { geocode, reverseGeocode, searchPlaces } from '../services/nominatim.js';
import { calculateVibeScore, WEIGHT_PRESETS } from '../services/vibe.js';
import type { LocationPulse, SafetyScore, MobilityScores, AmenitiesScore, VibeFactors, Location } from '../../../src/types/index.js';

const router = Router();
const prisma = new PrismaClient();

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

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
});

// -----------------------------------------------------------------------------
// Cache Settings
// -----------------------------------------------------------------------------

const CACHE_TTL_HOURS = 24;

async function getCachedPulse(zipCode: string): Promise<LocationPulse | null> {
  try {
    const cached = await prisma.pulseCache.findUnique({
      where: { zipCode },
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

    return JSON.parse(cached.pulseData) as LocationPulse;
  } catch {
    return null;
  }
}

async function cachePulse(zipCode: string, lat: number, lng: number, pulse: LocationPulse): Promise<void> {
  try {
    await prisma.pulseCache.upsert({
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
  } catch (error) {
    console.error('Failed to cache pulse data:', error);
  }
}

// -----------------------------------------------------------------------------
// Get Safety Score – DB cache → live FBI API → national-average fallback
// -----------------------------------------------------------------------------

async function getSafetyScoreForLocation(countyName: string): Promise<SafetyScore> {
  const cleanName = countyName.replace(' County', '').trim();

  // 1. Try cached row in database
  const county = await prisma.georgiaCounty.findFirst({
    where: { name: { contains: cleanName } },
  });

  if (county && county.safetyScore !== null) {
    return {
      overall: county.safetyScore,
      grade: (county.safetyGrade || 'C') as SafetyScore['grade'],
      riskLevel: scoreToRiskLevel(county.safetyScore),
      trend: 'stable',
      vsNational: calculateVsNational(county.violentCrimeRate, county.propertyCrimeRate),
      crimeRates: {
        violent: county.violentCrimeRate || 0,
        property: county.propertyCrimeRate || 0,
        total: (county.violentCrimeRate || 0) + (county.propertyCrimeRate || 0),
      },
      breakdown: {
        murder: rateToScore(county.murderRate || 0, 6.3),
        robbery: rateToScore(county.robberyRate || 0, 73.9),
        assault: rateToScore(county.assaultRate || 0, 268.2),
        burglary: rateToScore(county.burglaryRate || 0, 269.8),
        theft: rateToScore(county.larcenyRate || 0, 1401.9),
        vehicleTheft: rateToScore(county.vehicleTheftRate || 0, 282.7),
      },
      dataSource: `FBI Crime Data Explorer (${county.crimeDataYear || 2022})`,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 2. Not cached – fetch live from FBI Crime Data Explorer
  const fips = GEORGIA_COUNTIES[cleanName];
  if (fips) {
    try {
      console.log(`Fetching live FBI crime data for ${cleanName} (FIPS ${fips})`);
      const crimeData = await fetchCountyCrimeData(fips);

      if (crimeData) {
        const safetyResult = calculateSafetyScore(crimeData.rates);

        // Cache in DB so next request is instant
        await prisma.georgiaCounty.upsert({
          where: { fips },
          update: {
            name: cleanName,
            population: crimeData.population,
            violentCrimeRate: crimeData.rates.violentCrime,
            propertyCrimeRate: crimeData.rates.propertyCrime,
            murderRate: crimeData.rates.murder,
            robberyRate: crimeData.rates.robbery,
            assaultRate: crimeData.rates.assault,
            burglaryRate: crimeData.rates.burglary,
            larcenyRate: crimeData.rates.larceny,
            vehicleTheftRate: crimeData.rates.vehicleTheft,
            safetyScore: safetyResult.overall,
            safetyGrade: safetyResult.grade,
            crimeDataYear: crimeData.year,
          },
          create: {
            fips,
            name: cleanName,
            population: crimeData.population,
            violentCrimeRate: crimeData.rates.violentCrime,
            propertyCrimeRate: crimeData.rates.propertyCrime,
            murderRate: crimeData.rates.murder,
            robberyRate: crimeData.rates.robbery,
            assaultRate: crimeData.rates.assault,
            burglaryRate: crimeData.rates.burglary,
            larcenyRate: crimeData.rates.larceny,
            vehicleTheftRate: crimeData.rates.vehicleTheft,
            safetyScore: safetyResult.overall,
            safetyGrade: safetyResult.grade,
            crimeDataYear: crimeData.year,
          },
        });

        return safetyResult;
      }
    } catch (e) {
      console.error(`FBI API fetch failed for ${cleanName}:`, e);
    }
  } else {
    console.warn(`No FIPS code for county: "${cleanName}" – add it to GEORGIA_COUNTIES`);
  }

  // 3. Ultimate fallback: national averages (scores = 50, vsNational = 0)
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

    const { lat, lng, weights, weightPreset } = validation.data;

    // Determine weights to use
    const effectiveWeights: Partial<VibeFactors> = weightPreset
      ? WEIGHT_PRESETS[weightPreset]
      : weights;

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

    const [safetyScore, amenities, transitStops] = await Promise.all([
      getSafetyScoreForLocation(countyName),
      fetchAmenitiesInRadius(lat, lng, 8047), // 5 miles
      fetchTransitStops(lat, lng, 1609),
    ]);

    // Score calculations use 1-mile subset so scores stay accurate
    const amenitiesNear = amenities.filter((p: any) => (p.distance || 0) <= 1);
    const mobilityScores = calculateMobilityScoresFromPOIs(amenitiesNear, transitStops);
    const amenitiesScore = calculateAmenitiesScore(amenitiesNear);

    console.log(`Data fetching completed in ${Date.now() - startTime}ms`);

    // Calculate vibe score
    const vibeScore = calculateVibeScore(
      safetyScore,
      mobilityScores,
      amenitiesScore,
      effectiveWeights
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
      pois: [...amenities].sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)).slice(0, 100),
      dataQuality: determineDataQuality(safetyScore, mobilityScores, amenitiesScore),
      dataSources: [
        { name: 'FBI Crime Data Explorer', lastUpdated: safetyScore.lastUpdated, coverage: 'county' },
        { name: 'OpenStreetMap', lastUpdated: mobilityScores.lastUpdated, coverage: 'full' },
        { name: 'OpenStreetMap', lastUpdated: amenitiesScore.lastUpdated, coverage: 'full' },
      ],
    };

    // Cache the result
    if (zipCode !== 'unknown') {
      await cachePulse(zipCode, lat, lng, pulse);
    }

    // Log search if user is authenticated
    if (req.user) {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.userId,
          query: `${lat}, ${lng}`,
          address: geoResult.displayName,
          city: location.city,
          county: countyName,
          zipCode,
          lat,
          lng,
        },
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

    const { address, weights, weightPreset } = validation.data;

    // Determine weights to use
    const effectiveWeights: Partial<VibeFactors> = weightPreset
      ? WEIGHT_PRESETS[weightPreset]
      : weights;

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

    const [safetyScore, amenities, transitStops] = await Promise.all([
      getSafetyScoreForLocation(countyName),
      fetchAmenitiesInRadius(lat, lng, 8047), // 5 miles
      fetchTransitStops(lat, lng, 1609),
    ]);

    // Score calculations use 1-mile subset so scores stay accurate
    const amenitiesNear = amenities.filter((p: any) => (p.distance || 0) <= 1);
    const mobilityScores = calculateMobilityScoresFromPOIs(amenitiesNear, transitStops);
    const amenitiesScore = calculateAmenitiesScore(amenitiesNear);

    console.log(`Data fetching completed in ${Date.now() - startTime}ms`);

    // Calculate vibe score
    const vibeScore = calculateVibeScore(
      safetyScore,
      mobilityScores,
      amenitiesScore,
      effectiveWeights
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
      pois: [...amenities].sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)).slice(0, 100),
      dataQuality: determineDataQuality(safetyScore, mobilityScores, amenitiesScore),
      dataSources: [
        { name: 'FBI Crime Data Explorer', lastUpdated: safetyScore.lastUpdated, coverage: 'county' },
        { name: 'OpenStreetMap', lastUpdated: mobilityScores.lastUpdated, coverage: 'full' },
        { name: 'OpenStreetMap', lastUpdated: amenitiesScore.lastUpdated, coverage: 'full' },
      ],
    };

    // Cache the result
    if (zipCode !== 'unknown') {
      await cachePulse(zipCode, lat, lng, pulse);
    }

    // Log search if user is authenticated
    if (req.user) {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.userId,
          query: address,
          address: geoResult.displayName,
          city: location.city,
          county: countyName,
          zipCode,
          lat,
          lng,
        },
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
// -----------------------------------------------------------------------------

router.get('/georgia-coverage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [countyCount, cityCount, zipCount] = await Promise.all([
      prisma.georgiaCounty.count(),
      prisma.georgiaCity.count(),
      prisma.georgiaZipCode.count(),
    ]);

    const countiesWithData = await prisma.georgiaCounty.count({
      where: { safetyScore: { not: null } },
    });

    res.json({
      success: true,
      data: {
        state: 'Georgia',
        counties: countyCount,
        countiesWithCrimeData: countiesWithData,
        cities: cityCount,
        zipCodes: zipCount,
        dataSources: [
          { name: 'FBI Crime Data Explorer', type: 'crime', coverage: 'county-level' },
          { name: 'OpenStreetMap', type: 'amenities', coverage: 'real-time' },
          { name: 'Nominatim', type: 'geocoding', coverage: 'real-time' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
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
