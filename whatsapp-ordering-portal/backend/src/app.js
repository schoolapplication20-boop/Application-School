import express from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase, closeDatabase } from './config/database.js';
import { initializeRedis, closeRedis } from './config/redis.js';
import { corsMiddleware, corsErrorHandler } from './middleware/corsMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';

import authRoutes from './routes/authRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust Railway's / any cloud load-balancer proxy so express-rate-limit
// can read the real client IP from X-Forwarded-For instead of erroring.
app.set('trust proxy', 1);

// ============================================
// Middleware Setup
// ============================================

// Security
app.use(helmet());

// CORS
app.use(corsMiddleware);
app.use(corsErrorHandler);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting (general)
app.use(generalLimiter);

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp Ordering Portal API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API version
app.get('/api', (req, res) => {
  res.json({
    success: true,
    api: 'WhatsApp Ordering Portal',
    version: '1.0.0',
    description: 'SaaS platform for WhatsApp-based ordering',
  });
});

// API routes
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/businesses`, businessRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/webhooks/whatsapp`, webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

let server;

const shutdown = async () => {
  logger.info('Shutting down server...');

  if (server) {
    server.close(async () => {
      logger.info('✓ HTTP server closed');
      await closeDatabase();
      await closeRedis();
      process.exit(0);
    });
  }

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('✗ Forced shutdown after 10 seconds');
    process.exit(1);
  }, 10000);
};

const startServer = async () => {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await initializeDatabase();

    // Initialize Redis
    logger.info('Initializing Redis...');
    await initializeRedis();

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`✓ Server running on http://localhost:${PORT}`);
      logger.info(`✓ Environment: ${NODE_ENV}`);
      logger.info(`✓ API available at http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error(`✗ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at ${promise}: ${reason}`);
});

// Start server
startServer();

export default app;
