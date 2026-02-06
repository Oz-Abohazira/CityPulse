// =============================================================================
// COMPARE ROUTES - Location Comparison (Free Data Sources)
// =============================================================================

import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler.js';
import { optionalAuth, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { geocode } from '../services/nominatim.js';
import { fetchAmenitiesInRadius } from '../services/osm-amenities.js';
import { calculateMobilityScoresFromPOIs } from '../services/walkability.js';
import { calculateVibeScore, compareVibeScores } from '../services/vibe.js';
import { getCountyCrimeDataByName, calculateSafetyScore } from '../services/fbi-crime.js';
import { safeDbOperation, getPrisma } from '../lib/prisma.js';
import type { LocationPulse, SafetyScore, AmenitiesScore } from '../types.js';

const router = Router();

// Helper to get Prisma or throw unavailable error
function requireDatabase() {
  const prisma = getPrisma();
  if (!prisma) {
    throw ApiError.serviceUnavailable('Saved comparisons feature is not available - database not configured');
  }
  return prisma;
}

// Georgia bounding box for validation
const GEORGIA_BOUNDS = {
  minLat: 30.355757,
  maxLat: 35.000659,
  minLng: -85.605165,
  maxLng: -80.839729,
};

function isInGeorgia(lat: number, lng: number): boolean {
  return (
    lat >= GEORGIA_BOUNDS.minLat &&
    lat <= GEORGIA_BOUNDS.maxLat &&
    lng >= GEORGIA_BOUNDS.minLng &&
    lng <= GEORGIA_BOUNDS.maxLng
  );
}

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const compareSchema = z.object({
  addresses: z.array(z.string().min(3)).min(2, 'At least 2 addresses required').max(4, 'Maximum 4 addresses allowed'),
});

const saveComparisonSchema = z.object({
  name: z.string().optional(),
  locations: z.array(
    z.object({
      address: z.string().min(1),
      city: z.string().default(''),
      county: z.string().default(''),
      zipCode: z.string().default(''),
      lat: z.number(),
      lng: z.number(),
      pulseData: z.string().optional(),
    })
  ).min(2).max(4),
});

// -----------------------------------------------------------------------------
// POST /api/compare - Compare multiple locations
// -----------------------------------------------------------------------------

router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validation = compareSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { addresses } = validation.data;

    // Fetch pulse data for all locations in parallel
    const pulsePromises = addresses.map(async (address) => {
      // Geocode the address
      const geocodeResult = await geocode(address);
      if (!geocodeResult) {
        throw ApiError.notFound(`Could not find location: ${address}`);
      }

      const { lat, lng } = geocodeResult;

      // Verify it's in Georgia
      if (!isInGeorgia(lat, lng)) {
        throw ApiError.badRequest(`Location is outside Georgia: ${address}`);
      }

      // Get county for safety data
      const cityName = geocodeResult.address.city || geocodeResult.address.town || '';
      const zipCode = geocodeResult.address.postcode || '';
      const countyName = geocodeResult.address.county || '';

      // Fetch amenities from OSM
      const amenities = await fetchAmenitiesInRadius(lat, lng, 1500);

      // Calculate mobility scores
      const mobilityScores = calculateMobilityScoresFromPOIs(amenities, []);

      // Get safety score from static crime data
      const crimeData = getCountyCrimeDataByName(countyName);
      const safetyScore: SafetyScore = crimeData
        ? calculateSafetyScore(crimeData.rates)
        : {
            overall: 50,
            grade: 'C',
            riskLevel: 'moderate',
            trend: 'stable',
            vsNational: 0,
            crimeRates: { violent: 0, property: 0, total: 0 },
            breakdown: { murder: 50, robbery: 50, assault: 50, burglary: 50, theft: 50, vehicleTheft: 50 },
            dataSource: 'National averages (county data unavailable)',
            lastUpdated: new Date().toISOString(),
          };

      // Build amenities score
      const amenityCounts = {
        restaurants: amenities.filter(a => a.category === 'restaurant').length,
        grocery: amenities.filter(a => a.category === 'grocery').length,
        pharmacies: amenities.filter(a => a.category === 'pharmacy').length,
        cafes: amenities.filter(a => a.category === 'cafe').length,
        parks: amenities.filter(a => a.category === 'park').length,
        gyms: amenities.filter(a => a.category === 'gym').length,
      };

      const groceryScore = Math.min(100, amenityCounts.grocery * 20);
      const diningScore = Math.min(100, (amenityCounts.restaurants * 5) + (amenityCounts.cafes * 8));
      const healthcareScore = Math.min(100, amenityCounts.pharmacies * 25);
      const entertainmentScore = Math.min(100, amenityCounts.parks * 15);
      const shoppingScore = Math.min(100, amenityCounts.gyms * 20);
      const overallAmenityScore = Math.round((groceryScore + diningScore + healthcareScore + entertainmentScore + shoppingScore) / 5);

      const amenitiesScore: AmenitiesScore = {
        overall: overallAmenityScore,
        categories: {
          grocery: groceryScore,
          dining: diningScore,
          healthcare: healthcareScore,
          entertainment: entertainmentScore,
          shopping: shoppingScore,
        },
        highlights: {
          totalPOIs: amenities.length,
          groceryStores: amenityCounts.grocery,
          restaurants: amenityCounts.restaurants,
          healthcare: amenityCounts.pharmacies,
          parks: amenityCounts.parks,
          gyms: amenityCounts.gyms,
        },
        isFoodDesert: amenityCounts.grocery === 0,
        nearestByCategory: {},
        nearby: amenities.slice(0, 20).map(a => ({
          name: a.name,
          category: a.category,
          distance: a.distance,
          rating: null,
        })),
        dataSource: 'OpenStreetMap',
        lastUpdated: new Date().toISOString(),
      };

      // Calculate vibe score
      const vibeScore = await calculateVibeScore(safetyScore, mobilityScores, amenitiesScore);

      const pulse: LocationPulse = {
        id: `pulse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        location: {
          placeId: geocodeResult.osmId?.toString() || `osm_${Date.now()}`,
          formattedAddress: geocodeResult.displayName,
          city: cityName,
          state: 'Georgia',
          zipCode: zipCode,
          county: countyName.replace(' County', ''),
          country: 'USA',
          coordinates: { lat, lng },
        },
        analyzedAt: new Date(),
        safetyScore,
        mobilityScores,
        amenitiesScore,
        vibeScore,
        dataQuality: crimeData ? 'complete' : 'partial',
        dataSources: [
          { name: 'FBI Crime Data Explorer', lastUpdated: new Date(), coverage: crimeData ? 'full' : 'partial' },
          { name: 'OpenStreetMap', lastUpdated: new Date(), coverage: 'full' },
        ],
      };

      return pulse;
    });

    const pulses = await Promise.all(pulsePromises);

    // Compare the vibe scores
    const comparison = compareVibeScores(pulses.map((p) => p.vibeScore));

    // Build comparison metrics
    const metrics = buildComparisonMetrics(pulses);

    res.json({
      success: true,
      data: {
        locations: pulses,
        winner: {
          index: comparison.winner,
          location: pulses[comparison.winner].location,
          margin: comparison.margin,
        },
        metrics,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// POST /api/compare/save - Save a comparison (requires auth)
// -----------------------------------------------------------------------------

router.post('/save', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;

    const validation = saveComparisonSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { name, locations } = validation.data;

    const comparison = await prisma.comparison.create({
      data: {
        userId,
        name,
        locations: {
          create: locations.map((loc, index) => ({
            address: loc.address,
            city: loc.city || '',
            county: loc.county || '',
            zipCode: loc.zipCode || '',
            lat: loc.lat,
            lng: loc.lng,
            orderIndex: index,
            pulseData: loc.pulseData,
          })),
        },
      },
      include: {
        locations: true,
      },
    });

    res.status(201).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// GET /api/compare/saved - Get saved comparisons (requires auth)
// -----------------------------------------------------------------------------

router.get('/saved', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;

    const comparisons = await prisma.comparison.findMany({
      where: { userId },
      include: {
        locations: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: comparisons,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// DELETE /api/compare/saved/:id - Delete a saved comparison
// -----------------------------------------------------------------------------

router.delete('/saved/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.comparison.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw ApiError.notFound('Comparison not found');
    }

    await prisma.comparison.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Comparison deleted' },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

interface ComparisonMetric {
  name: string;
  values: number[];
  winner: number;
  difference: number;
}

function buildComparisonMetrics(pulses: LocationPulse[]): ComparisonMetric[] {
  const metrics: ComparisonMetric[] = [];

  // Overall Vibe Score
  const vibeScores = pulses.map((p) => p.vibeScore.overall);
  metrics.push({
    name: 'Overall Vibe Score',
    values: vibeScores,
    winner: indexOfMax(vibeScores),
    difference: Math.max(...vibeScores) - Math.min(...vibeScores),
  });

  // Safety Score
  const safetyScores = pulses.map((p) => p.safetyScore.overall);
  metrics.push({
    name: 'Safety Score',
    values: safetyScores,
    winner: indexOfMax(safetyScores),
    difference: Math.max(...safetyScores) - Math.min(...safetyScores),
  });

  // Walk Score
  const walkScores = pulses.map((p) => p.mobilityScores.walkScore.score);
  metrics.push({
    name: 'Walk Score',
    values: walkScores,
    winner: indexOfMax(walkScores),
    difference: Math.max(...walkScores) - Math.min(...walkScores),
  });

  // Transit Score
  const transitScores = pulses.map((p) => p.mobilityScores.transitScore.score);
  metrics.push({
    name: 'Transit Score',
    values: transitScores,
    winner: indexOfMax(transitScores),
    difference: Math.max(...transitScores) - Math.min(...transitScores),
  });

  // Amenities Score
  const amenityScores = pulses.map((p) => p.amenitiesScore.overall);
  metrics.push({
    name: 'Amenities Score',
    values: amenityScores,
    winner: indexOfMax(amenityScores),
    difference: Math.max(...amenityScores) - Math.min(...amenityScores),
  });

  // Grocery Score
  const groceryScores = pulses.map((p) => p.amenitiesScore.categories.grocery);
  metrics.push({
    name: 'Grocery Access',
    values: groceryScores,
    winner: indexOfMax(groceryScores),
    difference: Math.max(...groceryScores) - Math.min(...groceryScores),
  });

  return metrics;
}

function indexOfMax(arr: number[]): number {
  let maxIndex = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > arr[maxIndex]) {
      maxIndex = i;
    }
  }
  return maxIndex;
}

export { router as compareRouter };
