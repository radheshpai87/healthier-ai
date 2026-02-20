/**
 * app.config.js
 * ─────────────────────────────────────────────
 * Dynamic Expo config — reads secrets from .env
 * (never committed to git).
 *
 * Expo SDK 49+ automatically loads .env so no
 * extra dotenv package is needed.
 *
 * .env keys used:
 *   GEMINI_API_KEY   — Google Gemini API key
 *   BACKEND_URL      — overrides the auto-detected LAN URL
 * ─────────────────────────────────────────────
 */

const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Inject secrets from environment at build / dev-server time
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      // BACKEND_URL is written by start-all.sh at runtime; fallback via env
      backendUrl: process.env.BACKEND_URL || config.extra?.backendUrl || '',
    },
  };
};
