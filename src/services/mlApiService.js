/**
 * mlApiService.js
 * ─────────────────────────────────────────────
 * Client for the AuraHealth ML API.
 * Provides risk prediction, cycle analysis, and
 * health scoring via the deployed Random Forest model.
 *
 * Falls back to the local JS-based Random Forest
 * engine when offline or if the API is unreachable.
 * ─────────────────────────────────────────────
 */

import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { predictRisk as localPredict, quickRiskCheck as localQuickCheck, analyzeCycleHistory as localAnalyzeCycles } from '../engine/RandomForestRiskEngine';

// ── API Configuration ──────────────────────────
const ML_API_BASE = 'https://healthier-ml-api.onrender.com';
const REQUEST_TIMEOUT = 30000;  // 30s — allows for Render free-tier cold start (~20-40s)
const QUICK_TIMEOUT   = 5000;   // 5s — for health checks / pre-warm only

const api = axios.create({
  baseURL: ML_API_BASE,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Silently wake up the Render service in the background.
 * Call this on app launch — no-op if already warm or offline.
 */
export async function prewarmMLApi() {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;
    await api.get('/health', { timeout: QUICK_TIMEOUT });
  } catch {
    // Expected on first cold-start — ignore
  }
}

// ── Health Check ───────────────────────────────

/**
 * Check if the ML API is reachable and model is loaded.
 * @returns {Promise<boolean>}
 */
export async function isMLApiAvailable() {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return false;

    const res = await api.get('/health', { timeout: 4000 });
    return res.data?.status === 'healthy' && res.data?.model_loaded === true;
  } catch {
    return false;
  }
}

// ── Risk Prediction (ML API → Local Fallback) ─

/**
 * Predict risk using ML API with automatic local fallback.
 *
 * @param {Object} userData
 * @param {number} userData.age
 * @param {number} [userData.bmi]
 * @param {number} [userData.height] - Used to compute BMI if bmi not set
 * @param {number} [userData.weight] - Used to compute BMI if bmi not set
 * @param {number} [userData.stress_level]
 * @param {number} [userData.sleep_hours]
 * @param {number} [userData.exercise_freq]
 * @param {number} userData.cycle_length_avg
 * @param {number} [userData.cycle_variance]
 *
 * @returns {Promise<Object>} Prediction result (unified shape)
 */
export async function predictRisk(userData) {
  // Normalise: compute BMI from height/weight if missing
  const payload = { ...userData };
  if (!payload.bmi && payload.height && payload.weight) {
    const hm = payload.height / 100;
    payload.bmi = Math.round((payload.weight / (hm * hm)) * 10) / 10;
  }

  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) throw new Error('offline');

    const res = await api.post('/predict', payload);
    return normaliseApiResult(res.data, 'ml_api');
  } catch (err) {
    console.warn('[mlApiService] API predict failed, using local engine:', err.message || err);
    return localFallbackPredict(payload);
  }
}

/**
 * Quick risk check – minimal inputs.
 */
export async function quickRiskCheck(basicData) {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) throw new Error('offline');

    const res = await api.post('/predict/quick', basicData);
    return normaliseApiResult(res.data, 'ml_api');
  } catch {
    return localFallbackQuickCheck(basicData);
  }
}

/**
 * Batch predictions – always attempts API.
 */
export async function batchPredict(users) {
  try {
    const res = await api.post('/predict/batch', { users });
    return res.data;
  } catch {
    // Fallback: run each locally
    return {
      predictions: users.map((u, i) => {
        try {
          const r = localPredict({
            age: u.age || 25,
            bmi: u.bmi || 22,
            stress_level: u.stress_level || 3,
            sleep_hours: u.sleep_hours || 7,
            exercise_freq: u.exercise_freq || 3,
            cycle_length_avg: u.cycle_length_avg || 28,
          });
          return { index: i, risk_level: r.risk_level, confidence: r.confidence };
        } catch {
          return { index: i, risk_level: 'Unknown', confidence: 0 };
        }
      }),
      count: users.length,
      success_count: users.length,
      source: 'local_fallback',
    };
  }
}

// ── Cycle Analysis ─────────────────────────────

/**
 * Analyse cycle history via API; falls back to local analysis.
 *
 * @param {Object} params
 * @param {number[]} [params.cycle_lengths]
 * @param {string[]} [params.period_dates]
 * @returns {Promise<Object>}
 */
export async function analyzeCycles(params) {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) throw new Error('offline');

    const res = await api.post('/analyze/cycles', params);
    return { ...res.data, source: 'ml_api' };
  } catch {
    if (params.cycle_lengths) {
      const local = localAnalyzeCycles(params.cycle_lengths);
      return { ...local, source: 'local_fallback' };
    }
    // Convert period_dates to cycle_lengths first
    if (params.period_dates && params.period_dates.length >= 2) {
      const sorted = [...params.period_dates].sort();
      const lengths = [];
      for (let i = 1; i < sorted.length; i++) {
        const diff = Math.round(
          (new Date(sorted[i]) - new Date(sorted[i - 1])) / (1000 * 60 * 60 * 24)
        );
        if (diff >= 14 && diff <= 90) lengths.push(diff);
      }
      if (lengths.length > 0) {
        const local = localAnalyzeCycles(lengths);
        return { ...local, source: 'local_fallback' };
      }
    }
    return { error: 'Insufficient data', source: 'local_fallback' };
  }
}

// ── Health Score ────────────────────────────────

/**
 * Get detailed health score from API; falls back to local calculation.
 *
 * @param {Object} userData - Same shape as /predict input
 * @returns {Promise<Object>}
 */
export async function getHealthScore(userData) {
  const payload = { ...userData };
  if (!payload.bmi && payload.height && payload.weight) {
    const hm = payload.height / 100;
    payload.bmi = Math.round((payload.weight / (hm * hm)) * 10) / 10;
  }

  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) throw new Error('offline');

    const res = await api.post('/analyze/health-score', payload);
    return { ...res.data, source: 'ml_api' };
  } catch {
    // Simple local health score
    return computeLocalHealthScore(payload);
  }
}

// ── Model Info (diagnostic) ────────────────────

export async function getModelInfo() {
  try {
    const res = await api.get('/model/info');
    return res.data;
  } catch {
    return {
      model_type: 'Local Random Forest (JS)',
      num_trees: 5,
      offline: true,
    };
  }
}

// ═══════════════════════════════════════════════
//  Internal helpers
// ═══════════════════════════════════════════════

/**
 * Normalise the ML API response into a consistent shape
 * that the rest of the app expects.
 */
function normaliseApiResult(data, source) {
  return {
    risk_level: data.risk_level || 'Unknown',
    confidence: data.confidence ?? 0,
    probabilities: data.probabilities || null,
    recommendation_key: data.recommendation_key || 'TRY_AGAIN',
    health_score: data.health_score ?? null,
    grade: data.grade ?? null,
    timestamp: data.timestamp || new Date().toISOString(),
    source,
  };
}

/**
 * Run the local Random Forest engine as fallback.
 */
function localFallbackPredict(payload) {
  try {
    const data = {
      age: payload.age || 25,
      bmi: payload.bmi || 22,
      stress_level: payload.stress_level || 3,
      sleep_hours: payload.sleep_hours || 7,
      exercise_freq: payload.exercise_freq || 3,
      cycle_length_avg: payload.cycle_length_avg || 28,
      cycle_variance: payload.cycle_variance,
    };
    const result = localPredict(data);
    return normaliseApiResult(
      {
        risk_level: result.risk_level,
        confidence: result.confidence,
        recommendation_key: result.recommendation_key,
        health_score: null,
        grade: null,
      },
      'local_fallback'
    );
  } catch (err) {
    console.error('[mlApiService] Local fallback also failed:', err);
    return normaliseApiResult(
      { risk_level: 'Unknown', confidence: 0, recommendation_key: 'TRY_AGAIN' },
      'error'
    );
  }
}

function localFallbackQuickCheck(basicData) {
  try {
    const result = localQuickCheck(basicData);
    return normaliseApiResult(
      {
        risk_level: result.risk_level,
        confidence: result.confidence,
        recommendation_key: result.recommendation_key,
      },
      'local_fallback'
    );
  } catch {
    return normaliseApiResult(
      { risk_level: 'Unknown', confidence: 0, recommendation_key: 'TRY_AGAIN' },
      'error'
    );
  }
}

/**
 * Simple local health score when API is unreachable.
 * Mirrors the grade system from the API docs.
 */
function computeLocalHealthScore(data) {
  let score = 50; // baseline

  // BMI component (0-25 pts)
  const bmi = data.bmi || 22;
  if (bmi >= 18.5 && bmi < 25) score += 25;
  else if (bmi >= 17 && bmi < 30) score += 15;
  else score += 5;

  // Sleep (0-15 pts)
  const sleep = data.sleep_hours || 7;
  if (sleep >= 7 && sleep <= 9) score += 15;
  else if (sleep >= 6) score += 10;
  else score += 3;

  // Stress (0-15 pts, inverted)
  const stress = data.stress_level || 3;
  score += Math.max(0, Math.round((5 - stress) * 3.75));

  // Exercise (0-10 pts)
  const ex = data.exercise_freq || 3;
  score += Math.min(10, Math.round(ex * 1.7));

  // Cycle regularity bonus (0-10 pts)
  const cl = data.cycle_length_avg || 28;
  if (cl >= 24 && cl <= 32) score += 10;
  else if (cl >= 21 && cl <= 35) score += 5;

  score = Math.min(100, Math.max(0, score));

  let grade, grade_description;
  if (score >= 85) { grade = 'A'; grade_description = 'Excellent'; }
  else if (score >= 70) { grade = 'B'; grade_description = 'Good'; }
  else if (score >= 55) { grade = 'C'; grade_description = 'Fair'; }
  else if (score >= 40) { grade = 'D'; grade_description = 'Needs Improvement'; }
  else { grade = 'F'; grade_description = 'Poor'; }

  return {
    overall_score: score,
    grade,
    grade_description,
    source: 'local_fallback',
  };
}
