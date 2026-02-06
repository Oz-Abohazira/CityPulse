// =============================================================================
// AUTH ROUTES
// =============================================================================

import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler.js';
import { generateToken, requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getPrisma } from '../lib/prisma.js';

const router = Router();

// Helper to get Prisma or throw unavailable error
function requireDatabase() {
  const prisma = getPrisma();
  if (!prisma) {
    throw ApiError.serviceUnavailable('Authentication is not available - database not configured');
  }
  return prisma;
}

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// -----------------------------------------------------------------------------
// POST /api/auth/register
// -----------------------------------------------------------------------------

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password, firstName, lastName } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/login
// -----------------------------------------------------------------------------

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// GET /api/auth/me
// -----------------------------------------------------------------------------

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const prisma = requireDatabase();
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            savedLocations: true,
            searchHistory: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// POST /api/auth/logout (optional - client-side token removal is sufficient)
// -----------------------------------------------------------------------------

router.post('/logout', (_req: Request, res: Response) => {
  // JWT tokens are stateless, so logout is handled client-side
  // This endpoint exists for consistency
  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

export { router as authRouter };
