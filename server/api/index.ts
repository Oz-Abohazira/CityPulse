// =============================================================================
// VERCEL SERVERLESS API HANDLER
// Wraps Express app for Vercel deployment
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { authRouter } from '../src/routes/auth.js';
import { pulseRouter } from '../src/routes/pulse.js';
import { savedRouter } from '../src/routes/saved.js';
import { compareRouter } from '../src/routes/compare.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

// Security headers (relaxed for serverless)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - allow frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  // Add your deployed frontend URLs here
  process.env.FRONTEND_URL,
  'https://citypulse-frontend.vercel.app',
  'https://city-pulse-frontend.vercel.app',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Check if the origin is in our allowed list or is a Vercel preview URL
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'CityPulse API',
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      pulse: '/api/pulse',
      auth: '/api/auth',
      saved: '/api/saved',
      compare: '/api/compare',
    }
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/pulse', pulseRouter);
app.use('/api/saved', savedRouter);
app.use('/api/compare', compareRouter);

// -----------------------------------------------------------------------------
// Error Handling
// -----------------------------------------------------------------------------

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  });
});

// Global error handler
app.use(errorHandler);

// Export for Vercel
export default app;
