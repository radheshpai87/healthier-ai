/**
 * constants.js
 * ─────────────────────────────────────────────
 * Application-wide constants for AuraHealth.
 * Contains village codes, risk thresholds,
 * emergency contacts, and sync configuration.
 * ─────────────────────────────────────────────
 */

// ── Risk Level Thresholds ──────────────────────
export const RISK_LEVELS = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
};

export const RISK_THRESHOLDS = {
  LOW_MAX: 3,       // 0–3 → LOW
  MODERATE_MAX: 6,  // 4–6 → MODERATE
  // 7+ → HIGH
};

// ── Risk Level Colors ──────────────────────────
export const RISK_COLORS = {
  LOW: '#4CAF50',       // Green
  MODERATE: '#FF9800',  // Orange
  HIGH: '#F44336',      // Red
};

// ── Symptom Weights (used by rule-based engine) ─
export const SYMPTOM_WEIGHTS = {
  heavyBleeding: 4,
  fatigue: 2,
  dizziness: 3,
  lowHb: 4,
  irregularCycles: 2,
  pain: 2,
  pregnancyIssue: 5,
};

// ── Emergency Intensity Modifiers ──────────────
export const EMERGENCY_INTENSITY = {
  fainted: 2,
  severePain: 2,
  vomiting: 2,
};

// ── Default Emergency Contacts ─────────────────
export const DEFAULT_EMERGENCY_CONTACTS = {
  ashaNumber: '',       // To be configured per village
  familyNumber: '',     // Optional, user-configured
  nationalEmergency: '112',
};

// ── Sync Configuration ─────────────────────────
// For local development, the app needs your computer's LAN IP
// (not localhost, since the phone is a separate device).
// Set BACKEND_URL in app.json → extra, or it falls back to Render.
import Constants from 'expo-constants';

const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  'https://aurahealth-backend.onrender.com/api';

export const SYNC_CONFIG = {
  // Backend API URL — reads from app.json extra.backendUrl
  API_BASE_URL: BACKEND_URL,
  // Ping endpoint to check connectivity
  PING_URL: `${BACKEND_URL}/ping`,
  // Sync interval in milliseconds (5 minutes)
  SYNC_INTERVAL_MS: 5 * 60 * 1000,
  // Maximum retry attempts per record
  MAX_RETRIES: 5,
};

// ── Storage Keys ───────────────────────────────
export const STORAGE_KEYS = {
  ROLE: 'aura_role',
  VILLAGE_CODE: 'aura_village_code',
  HEALTH_RECORDS: 'aura_health_records',
  SYNC_QUEUE: 'aura_sync_queue',
  EMERGENCY_CONTACTS: 'aura_emergency_contacts',
  LAST_SYNC: 'aura_last_sync',
  ASHA_VISITS: 'aura_asha_visits',
};

// ── User Roles ─────────────────────────────────
export const ROLES = {
  WOMAN: 'woman',
  ASHA: 'asha',
};

// ── Advice Strings (EN / HI) ──────────────────
export const ADVICE = {
  LOW: {
    en: 'Your health indicators look normal. Continue maintaining a healthy lifestyle with regular meals, hydration, and rest.',
    hi: 'आपके स्वास्थ्य संकेतक सामान्य दिख रहे हैं। नियमित भोजन, पानी और आराम के साथ स्वस्थ जीवनशैली बनाए रखें।',
  },
  MODERATE: {
    en: 'Some symptoms need attention. Please visit your nearest health center or talk to an ASHA worker within 2-3 days.',
    hi: 'कुछ लक्षणों पर ध्यान देने की जरूरत है। कृपया 2-3 दिनों के भीतर अपने निकटतम स्वास्थ्य केंद्र या आशा कार्यकर्ता से मिलें।',
  },
  HIGH: {
    en: 'URGENT: Your symptoms indicate a serious health concern. Please seek immediate medical attention or call emergency services.',
    hi: 'तत्काल: आपके लक्षण गंभीर स्वास्थ्य चिंता का संकेत देते हैं। कृपया तुरंत चिकित्सा सहायता लें या आपातकालीन सेवाओं को कॉल करें।',
  },
};
