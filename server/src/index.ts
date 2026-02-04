// =============================================================================
// CITYPULSE - EXPRESS SERVER ENTRY POINT
// =============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';
import { pulseRouter } from './routes/pulse.js';
import { savedRouter } from './routes/saved.js';
import { compareRouter } from './routes/compare.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

// Security headers
app.use(helmet());

// CORS - allow frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://your-frontend-domain.com'
    : ['http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
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

// -----------------------------------------------------------------------------
// Start Server
// -----------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏙️  CITYPULSE API SERVER                                    ║
║   Location Intelligence & Neighborhood Analysis               ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                   ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
