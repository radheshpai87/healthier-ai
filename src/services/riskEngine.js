/**
 * riskEngine.js
 * ─────────────────────────────────────────────
 * Unified risk scoring engine.
 *
 * Priority chain:
 *   1. ML API (Remote Random Forest – 98.44% accuracy)
 *   2. Local JS Random Forest (offline-capable)
 *   3. Rule-based symptom scoring (always works)
 *
 * The rule-based engine is kept as the final
 * fallback and is still used directly by the
 * ASHA / Symptom flow for quick symptom checks.
 * ─────────────────────────────────────────────
 */

import {
  SYMPTOM_WEIGHTS,
  EMERGENCY_INTENSITY,
  RISK_THRESHOLDS,
  RISK_LEVELS,
  RISK_COLORS,
  ADVICE,
  ML_RISK_COLORS,
  HEALTH_GRADE_COLORS,
} from '../utils/constants';
import { predictRisk as mlPredict, getHealthScore as mlHealthScore } from './mlApiService';

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

// ═══════════════════════════════════════════════
//  ML-Enhanced Risk Assessment
// ═══════════════════════════════════════════════

/**
 * Map ML API risk levels (Low/Medium/High) to the
 * legacy constants (LOW/MODERATE/HIGH) used by UI.
 */
function mapMLLevel(mlLevel) {
  switch (mlLevel) {
    case 'Low':    return RISK_LEVELS.LOW;
    case 'Medium': return RISK_LEVELS.MODERATE;
    case 'High':   return RISK_LEVELS.HIGH;
    default:       return RISK_LEVELS.LOW;
  }
}

/**
 * Enhanced risk assessment that combines ML prediction
 * with the symptom-based rule engine.
 *
 * @param {Object} params
 * @param {Object} params.symptoms       - Symptom boolean flags
 * @param {Object} params.emergency      - Emergency intensity flags
 * @param {Object} params.profile        - { age, height, weight, bmi, avgCycleLength }
 * @param {Object} params.lifestyle      - { stress_level, sleep_hours, exercise_freq }
 * @param {string} [params.language='en']
 *
 * @returns {Promise<Object>} Enriched risk result
 */
export async function enhancedRiskAssessment({
  symptoms = {},
  emergency = {},
  profile = {},
  lifestyle = {},
  language = 'en',
}) {
  const lang = language === 'hi' ? 'hi' : 'en';

  // ── 1. Always run the rule-based engine (instant) ──
  const ruleResult = calculateRisk(symptoms, emergency, lang);

  // ── 2. Attempt ML prediction if we have profile data ──
  let mlResult = null;
  if (profile.age && (profile.avgCycleLength || lifestyle.cycle_length_avg)) {
    try {
      const mlInput = {
        age: profile.age,
        bmi: profile.bmi || undefined,
        height: profile.height || undefined,
        weight: profile.weight || undefined,
        stress_level: lifestyle.stress_level || 3,
        sleep_hours: lifestyle.sleep_hours || 7,
        exercise_freq: lifestyle.exercise_freq || 3,
        cycle_length_avg: profile.avgCycleLength || lifestyle.cycle_length_avg || 28,
        cycle_variance: lifestyle.cycle_variance || undefined,
      };
      mlResult = await mlPredict(mlInput);
    } catch (err) {
      console.warn('[riskEngine] ML prediction failed:', err.message);
    }
  }

  // ── 3. Merge: If emergency flags are set, rule-engine takes priority ──
  const hasEmergency = ruleResult.requiresEmergency;
  const useML = mlResult && mlResult.risk_level !== 'Unknown';

  // The "effective" level — use whichever is more severe
  let effectiveLevel = ruleResult.level;
  let effectiveColor = ruleResult.color;
  let mlConfidence = null;
  let healthScore = null;
  let healthGrade = null;
  let recommendationKey = null;

  if (useML) {
    const mlMappedLevel = mapMLLevel(mlResult.risk_level);
    mlConfidence = mlResult.confidence;
    healthScore = mlResult.health_score;
    healthGrade = mlResult.grade;
    recommendationKey = mlResult.recommendation_key;

    // Use the more severe of ML vs rule-based
    const severityOrder = { LOW: 0, MODERATE: 1, HIGH: 2 };
    if (severityOrder[mlMappedLevel] >= severityOrder[ruleResult.level]) {
      effectiveLevel = mlMappedLevel;
      effectiveColor = RISK_COLORS[mlMappedLevel];
    }
  }

  // Emergency always forces HIGH
  if (hasEmergency) {
    effectiveLevel = RISK_LEVELS.HIGH;
    effectiveColor = RISK_COLORS[RISK_LEVELS.HIGH];
  }

  return {
    // Legacy fields (backward-compatible with ResultScreen / ASHAScreen)
    score: ruleResult.score,
    level: effectiveLevel,
    color: effectiveColor,
    advice: ADVICE[effectiveLevel]?.[lang] || ruleResult.advice,
    requiresEmergency: hasEmergency || effectiveLevel === RISK_LEVELS.HIGH,

    // ML-enriched fields
    mlAvailable: useML,
    mlConfidence,
    healthScore,
    healthGrade,
    recommendationKey,
    source: useML ? (mlResult.source || 'ml_api') : 'rule_based',
  };
}
