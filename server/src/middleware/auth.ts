// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Middleware that requires authentication
 */
export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(ApiError.unauthorized('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Middleware that optionally extracts user if token present
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.user = decoded;
    }

    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
