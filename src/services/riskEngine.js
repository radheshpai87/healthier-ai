/**
 * riskEngine.js
 * ─────────────────────────────────────────────
 * Pure JavaScript rule-based risk scoring engine.
 * NO ML, NO AI, NO API calls.
 * Runs 100% offline on-device.
 *
 * Weighted scoring system:
 *   heavyBleeding → 4   fatigue → 2
 *   dizziness     → 3   lowHb   → 4
 *   irregularCycles → 2  pain   → 2
 *   pregnancyIssue → 5
 *
 * Emergency intensity modifiers:
 *   fainted    → +2   severePain → +2   vomiting → +2
 *
 * Risk Levels:
 *   0–3 → LOW | 4–6 → MODERATE | 7+ → HIGH
 * ─────────────────────────────────────────────
 */

import {
  SYMPTOM_WEIGHTS,
  EMERGENCY_INTENSITY,
  RISK_THRESHOLDS,
  RISK_LEVELS,
  RISK_COLORS,
  ADVICE,
} from '../utils/constants';

/**
 * Calculate risk score from symptoms.
 *
 * @param {Object} symptoms - Boolean flags for each symptom
 * @param {boolean} symptoms.heavyBleeding
 * @param {boolean} symptoms.fatigue
 * @param {boolean} symptoms.dizziness
 * @param {boolean} symptoms.lowHb
 * @param {boolean} symptoms.irregularCycles
 * @param {boolean} symptoms.pain
 * @param {boolean} symptoms.pregnancyIssue
 * @param {Object} [emergency] - Emergency intensity flags
 * @param {boolean} [emergency.fainted]
 * @param {boolean} [emergency.severePain]
 * @param {boolean} [emergency.vomiting]
 * @param {string} [language='en'] - Language code for advice
 *
 * @returns {Object} Risk assessment result
 * @returns {number} result.score          - Numeric risk score
 * @returns {string} result.level          - LOW | MODERATE | HIGH
 * @returns {string} result.color          - Hex color for the level
 * @returns {string} result.advice         - Localized advice string
 * @returns {boolean} result.requiresEmergency - Whether immediate action is needed
 */
export function calculateRisk(symptoms = {}, emergency = {}, language = 'en') {
  // ── Step 1: Sum base symptom weights ───────
  let score = 0;

  Object.keys(SYMPTOM_WEIGHTS).forEach((key) => {
    if (symptoms[key]) {
      score += SYMPTOM_WEIGHTS[key];
    }
  });

  // ── Step 2: Add emergency intensity ────────
  let emergencyScore = 0;
  Object.keys(EMERGENCY_INTENSITY).forEach((key) => {
    if (emergency[key]) {
      emergencyScore += EMERGENCY_INTENSITY[key];
    }
  });
  score += emergencyScore;

  // ── Step 3: Determine risk level ───────────
  let level;
  if (score <= RISK_THRESHOLDS.LOW_MAX) {
    level = RISK_LEVELS.LOW;
  } else if (score <= RISK_THRESHOLDS.MODERATE_MAX) {
    level = RISK_LEVELS.MODERATE;
  } else {
    level = RISK_LEVELS.HIGH;
  }

  // ── Step 4: Determine if emergency action needed ──
  // Emergency is required if:
  //   - Risk level is HIGH, OR
  //   - Any emergency intensity flag is true
  const requiresEmergency =
    level === RISK_LEVELS.HIGH || emergencyScore > 0;

  // ── Step 5: Build result ───────────────────
  const lang = language === 'hi' ? 'hi' : 'en';

  return {
    score,
    level,
    color: RISK_COLORS[level],
    advice: ADVICE[level][lang],
    requiresEmergency,
  };
}

/**
 * Get a human-readable summary of symptoms.
 *
 * @param {Object} symptoms - Symptom flags
 * @param {Object} emergency - Emergency flags
 * @param {string} [language='en']
 * @returns {string[]} Array of active symptom labels
 */
export function getActiveSymptomLabels(symptoms = {}, emergency = {}, language = 'en') {
  const labels = {
    en: {
      heavyBleeding: 'Heavy Bleeding',
      fatigue: 'Fatigue',
      dizziness: 'Dizziness',
      lowHb: 'Low Hemoglobin',
      irregularCycles: 'Irregular Cycles',
      pain: 'Pain / Cramps',
      pregnancyIssue: 'Pregnancy Complication',
      fainted: 'Fainted',
      severePain: 'Severe Pain',
      vomiting: 'Vomiting',
    },
    hi: {
      heavyBleeding: 'भारी रक्तस्राव',
      fatigue: 'थकान',
      dizziness: 'चक्कर आना',
      lowHb: 'कम हीमोग्लोबिन',
      irregularCycles: 'अनियमित चक्र',
      pain: 'दर्द / ऐंठन',
      pregnancyIssue: 'गर्भावस्था जटिलता',
      fainted: 'बेहोश हुई',
      severePain: 'तीव्र दर्द',
      vomiting: 'उल्टी',
    },
  };

  const lang = language === 'hi' ? 'hi' : 'en';
  const active = [];

  Object.keys(symptoms).forEach((key) => {
    if (symptoms[key] && labels[lang][key]) {
      active.push(labels[lang][key]);
    }
  });

  Object.keys(emergency).forEach((key) => {
    if (emergency[key] && labels[lang][key]) {
      active.push(labels[lang][key]);
    }
  });

  return active;
}
