// =============================================================================
// SAVED ROUTES - User Saved Locations
// =============================================================================

import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getPrisma } from '../lib/prisma.js';

const router = Router();

// Helper to get Prisma or throw unavailable error
function requireDatabase() {
  const prisma = getPrisma();
  if (!prisma) {
    throw ApiError.serviceUnavailable('Saved locations feature is not available - database not configured');
  }
  return prisma;
}

// All routes require authentication
router.use(requireAuth);

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const saveLocationSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  county: z.string().default(''),
  state: z.string().default('GA'),
  zipCode: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  nickname: z.string().optional(),
  notes: z.string().optional(),
  pulseData: z.string().optional(), // JSON string of pulse data
});

const updateLocationSchema = z.object({
  nickname: z.string().optional(),
  notes: z.string().optional(),
});

// -----------------------------------------------------------------------------
// GET /api/saved - Get all saved locations
// -----------------------------------------------------------------------------

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;

    const savedLocations = await prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
    });

    // Parse pulse data from JSON strings
    const locations = savedLocations.map((loc) => ({
      ...loc,
      pulseData: loc.pulseData ? JSON.parse(loc.pulseData) : null,
    }));

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// POST /api/saved - Save a location
// -----------------------------------------------------------------------------

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;

    const validation = saveLocationSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const data = validation.data;

    // Check if already saved
    const existing = await prisma.savedLocation.findUnique({
      where: {
        userId_address: {
          userId,
          address: data.address,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict('Location already saved');
    }

    const savedLocation = await prisma.savedLocation.create({
      data: {
        userId,
        address: data.address,
        city: data.city,
        county: data.county,
        state: data.state,
        zipCode: data.zipCode,
        lat: data.lat,
        lng: data.lng,
        nickname: data.nickname,
        notes: data.notes,
        pulseData: data.pulseData,
        pulseDate: data.pulseData ? new Date() : null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...savedLocation,
        pulseData: savedLocation.pulseData ? JSON.parse(savedLocation.pulseData) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// GET /api/saved/:id - Get a single saved location
// -----------------------------------------------------------------------------

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const savedLocation = await prisma.savedLocation.findFirst({
      where: { id, userId },
    });

    if (!savedLocation) {
      throw ApiError.notFound('Saved location not found');
    }

    // Update last viewed
    await prisma.savedLocation.update({
      where: { id },
      data: { lastViewed: new Date() },
    });

    res.json({
      success: true,
      data: {
        ...savedLocation,
        pulseData: savedLocation.pulseData ? JSON.parse(savedLocation.pulseData) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/saved/:id - Update a saved location
// -----------------------------------------------------------------------------

router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const validation = updateLocationSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    // Verify ownership
    const existing = await prisma.savedLocation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw ApiError.notFound('Saved location not found');
    }

    const updated = await prisma.savedLocation.update({
      where: { id },
      data: validation.data,
    });

    res.json({
      success: true,
      data: {
        ...updated,
        pulseData: updated.pulseData ? JSON.parse(updated.pulseData) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// DELETE /api/saved/:id - Delete a saved location
// -----------------------------------------------------------------------------

router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;
    const id = req.params.id as string;

    // Verify ownership
    const existing = await prisma.savedLocation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw ApiError.notFound('Saved location not found');
    }

    await prisma.savedLocation.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Location removed from saved' },
    });
  } catch (error) {
    next(error);
  }
});

export { router as savedRouter };
