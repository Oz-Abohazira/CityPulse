// =============================================================================
// COMPARE ROUTES - Location Comparison (Free Data Sources)
// =============================================================================

import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler.js';
import { optionalAuth, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { geocode } from '../services/nominatim.js';
import { fetchAmenitiesInRadius } from '../services/osm-amenities.js';
import { calculateMobilityScoresFromPOIs } from '../services/walkability.js';
import { calculateVibeScore, compareVibeScores } from '../services/vibe.js';
import type { LocationPulse, SafetyScore, AmenitiesScore } from '../types.js';

const router = Router();
const prisma = new PrismaClient();

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
      const county = await prisma.georgiaCounty.findFirst({
        where: {
          OR: [
            { cities: { some: { name: { contains: geocodeResult.city || '' } } } },
            { zipCodes: { some: { zipCode: geocodeResult.zipCode || '' } } },
          ],
        },
      });

      // Fetch amenities from OSM
      const amenities = await fetchAmenitiesInRadius(lat, lng, 1500);

      // Calculate mobility scores
      const mobilityScores = calculateMobilityScoresFromPOIs(amenities);

      // Build safety score from county data
      const safetyScore: SafetyScore = {
        score: county?.safetyScore || 50,
        grade: (county?.safetyGrade as 'A' | 'B' | 'C' | 'D' | 'F') || 'C',
        crimeIndex: county?.violentCrimeRate ? Math.round(county.violentCrimeRate / 4) : 50,
        violentCrimeRate: county?.violentCrimeRate || null,
        propertyCrimeRate: county?.propertyCrimeRate || null,
        trend: 'stable',
        comparedToNational: county?.safetyScore && county.safetyScore > 50 ? 'below' : 'above',
        dataSource: 'FBI Crime Data Explorer',
        dataYear: county?.crimeDataYear || 2022,
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

      const essentialsScore = Math.min(100, (amenityCounts.grocery * 20) + (amenityCounts.pharmacies * 25));
      const diningScore = Math.min(100, (amenityCounts.restaurants * 5) + (amenityCounts.cafes * 8));
      const lifestyleScore = Math.min(100, (amenityCounts.parks * 15) + (amenityCounts.gyms * 20));

      const amenitiesScore: AmenitiesScore = {
        overallScore: Math.round((essentialsScore + diningScore + lifestyleScore) / 3),
        essentialsScore,
        diningScore,
        lifestyleScore,
        counts: amenityCounts,
        nearby: amenities.slice(0, 20).map(a => ({
          name: a.name,
          category: a.category,
          distance: a.distance,
          rating: null,
        })),
      };

      // Calculate vibe score
      const vibeScore = calculateVibeScore(safetyScore, mobilityScores, amenitiesScore);

      const pulse: LocationPulse = {
        id: `pulse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        location: {
          placeId: geocodeResult.placeId,
          formattedAddress: geocodeResult.displayName,
          city: geocodeResult.city || '',
          state: 'Georgia',
          zipCode: geocodeResult.zipCode || '',
          county: county?.name || '',
          coordinates: { lat, lng },
        },
        analyzedAt: new Date(),
        safetyScore,
        mobilityScores,
        amenitiesScore,
        vibeScore,
        dataQuality: county ? 'complete' : 'partial',
        dataSources: [
          { name: 'FBI Crime Data Explorer', lastUpdated: new Date(), coverage: county ? 'full' : 'partial' },
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
    const userId = req.user!.userId;
    const { id } = req.params;

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
  const safetyScores = pulses.map((p) => p.safetyScore.score);
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
  const amenityScores = pulses.map((p) => p.amenitiesScore.overallScore);
  metrics.push({
    name: 'Amenities Score',
    values: amenityScores,
    winner: indexOfMax(amenityScores),
    difference: Math.max(...amenityScores) - Math.min(...amenityScores),
  });

  // Essentials Score
  const essentialsScores = pulses.map((p) => p.amenitiesScore.essentialsScore);
  metrics.push({
    name: 'Essentials Access',
    values: essentialsScores,
    winner: indexOfMax(essentialsScores),
    difference: Math.max(...essentialsScores) - Math.min(...essentialsScores),
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
