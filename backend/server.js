/**
 * server.js
 * ─────────────────────────────────────────────
 * AuraHealth Backend Server
 *
 * Tech: Node.js + Express + MongoDB Atlas (Free M0)
 *
 * Features:
 *   - Receives anonymized health records from mobile app
 *   - Provides aggregated analytics for NGO dashboard
 *   - HTTPS-ready (TLS handled by deployment platform)
 *   - Rate limiting to prevent abuse
 *   - Helmet for security headers
 *   - CORS enabled for dashboard origins
 *
 * Privacy:
 *   - NO personal data is stored or processed
 *   - Only villageCode for geographic grouping
 *   - All data is anonymized at the mobile level
 *
 * Deploy (FREE):
 *   - Render.com Free Tier
 *   - Railway.app Free Tier
 *   - MongoDB Atlas M0 (Free)
 * ─────────────────────────────────────────────
 */

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const healthRoutes = require('./routes/healthRoutes');

// ── Configuration ──────────────────────────────
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in .env');
  console.error('Please copy .env.example to .env and add your MongoDB Atlas URI.');
  process.exit(1);
}

// ── Express App Setup ──────────────────────────
const app = express();

// Security headers
app.use(helmet());

// CORS — allow mobile app and dashboard
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:19006', // Expo web
      // Add your deployed dashboard URL here:
      // 'https://aurahealth-dashboard.netlify.app',
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// ── Rate Limiting ──────────────────────────────
// Prevent abuse: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// ── Routes ─────────────────────────────────────
app.use('/api', healthRoutes);

// ── Health Check (root) ────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'AuraHealth Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      ping: 'GET /api/ping',
      sync: 'POST /api/sync',
      villageAnalytics: 'GET /api/analytics/village/:code',
      trends: 'GET /api/analytics/trends/:code',
      villages: 'GET /api/analytics/villages',
    },
  });
});

// ── 404 Handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Error Handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── MongoDB Connection + Server Start ──────────
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');

    app.listen(PORT, () => {
      console.log(`AuraHealth backend running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/`);
      console.log(`   API base:     http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });

module.exports = app;
