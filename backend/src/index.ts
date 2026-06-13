/**
 * Fishing God Backend - Express Application Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { checkConnection } from './db';
import { enforceHttps, sanitizeInput, additionalSecurityHeaders } from './middleware/security';
import { auditMiddleware } from './middleware/audit';

// Import routes
import { economicsRouter } from './routes/economics';
import { geoRouter } from './routes/geography';
import { speciesRouter } from './routes/species';
import { syncRouter } from './routes/sync';
import { marketRouter } from './routes/market';
import { waterQualityRouter } from './routes/waterQuality';
import { authRouter } from './routes/auth';
import { knowledgeRouter } from './routes/knowledge';
import { diseasesRouter } from './routes/diseases';
import { doctorsRouter } from './routes/doctors';
import { appointmentsRouter } from './routes/appointments';
import { locationsRouter } from './routes/locations';
import { treatmentsRouter } from './routes/treatments';
import { labReportsRouter } from './routes/labReports';
import { hatcheriesRouter } from './routes/hatcheries';
import { marketplaceRouter } from './routes/marketplace';
import { notificationsRouter } from './routes/notifications';
import { cropCyclesAndAssetsRouter } from './routes/cropCyclesAndAssets';
import { adminRouter } from './routes/admin';
import { yojanaRouter } from './routes/yojana';
import { baipFarmersRouter } from './routes/baipFarmers';
import { startHatcheryCron } from './cron/hatcheryNotifications';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.use((req, res, next) => {
  const startedAt = Date.now();

  logger.info('HTTP request started', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  res.on('finish', () => {
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

// HTTPS enforcement (production only — redirects HTTP to HTTPS)
app.use(enforceHttps);

// Security middleware
const cspDirectives: Record<string, string[] | null> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};
if (process.env.NODE_ENV === 'production') {
  cspDirectives.upgradeInsecureRequests = [];
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives as any,
  },
  crossOriginEmbedderPolicy: false, // Required for mobile app image loading
}));

// Additional security headers (Permissions-Policy, Referrer-Policy, etc.)
app.use(additionalSecurityHeaders);
// CORS: strict in production, permissive in development.
// Native mobile apps don't send Origin headers, so null-origin is always allowed.
// Browser clients (Expo web, admin dashboards) must be whitelisted.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',  // admin dashboard (Next.js dev)
  'http://localhost:8081',
  'http://localhost:19006',
  'http://10.0.2.2:3000',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In dev, allow all origins for convenience
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // In production, reject unknown browser origins
    logger.warn('CORS blocked', { origin });
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
}));

// Rate limiting — generous limits for a mobile app whose users may share
// a NAT IP.  Catalog reads are cheap; auth/write calls get a tighter cap.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1 000 catalog/data reads per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please wait a moment and try again.' },
});
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // tighter cap for mutations / sync
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please wait a moment and try again.' },
});
// Auth-specific limiter: strict brute-force protection.
// 20 attempts per 15 minutes per IP (prevents password guessing at scale).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  skipSuccessfulRequests: true, // only count failed/non-2xx responses toward the cap
});

// Apply per-route-type limiters instead of a single global cap
app.use('/api/v1/auth', authLimiter as any); // strict brute-force guard
app.use('/api/v1/admin/login', authLimiter as any); // admin login uses the same strict cap
app.use('/api/v1/sync', writeLimiter as any);
app.use('/api/v1/water-quality', writeLimiter as any);
app.use(readLimiter as any); // everything else (species, market, geo, economics, equipment)

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization — strip HTML tags and XSS vectors from all string inputs
app.use(sanitizeInput);

// Audit logging — attaches req.audit() helper to all requests
app.use(auditMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await checkConnection();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/economics', economicsRouter);
app.use('/api/v1/geo', geoRouter);
app.use('/api/v1/species', speciesRouter);
app.use('/api/v1/sync', syncRouter);
app.use('/api/v1/market', marketRouter);
app.use('/api/v1/water-quality', waterQualityRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/knowledge', knowledgeRouter);
app.use('/api/v1/diseases', diseasesRouter);
app.use('/api/v1/doctors', doctorsRouter);
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/hatcheries', hatcheriesRouter);
app.use('/api/v1/marketplace', marketplaceRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1', cropCyclesAndAssetsRouter);  // /api/v1/crop-cycles, /api/v1/farm-assets
app.use('/api/v1/treatments', treatmentsRouter);
app.use('/api/v1/lab-reports', labReportsRouter);
app.use('/api/v1/locations', locationsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/yojana', yojanaRouter);
app.use('/api/v1/baip-farmers', baipFarmersRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Fishing God API',
    version: '1.0.0',
    description: 'Aquaculture Intelligence Platform for Indian Subcontinent',
    endpoints: {
      health: '/health',
      economics: '/api/v1/economics',
      geography: '/api/v1/geo',
      species: '/api/v1/species',
      sync: '/api/v1/sync',
      market: '/api/v1/market'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Express error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  });
});

async function startServer() {
  const dbConnected = await checkConnection();

  if (!dbConnected) {
    logger.error('Startup aborted because PostgreSQL is unavailable', {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'fishing_god',
      user: process.env.DB_USER || 'fishinggod',
    });
    process.exit(1);
    return;
  }

  app.listen(PORT, HOST, () => {
    logger.info(`Fishing God API server running on http://${HOST}:${PORT}`);
  });
}

// Start hatchery stage-by-stage notifications cron job
startHatcheryCron();

// Start server only when executed directly so tests can import the app safely.
if (require.main === module) {
  void startServer();
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
