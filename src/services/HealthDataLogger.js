/**
 * Health Data Logger
 * 
 * Manages daily health logs including symptoms, vitals, and risk assessments.
 * Integrates with Random Forest Risk Engine for offline predictions.
 */

import * as SecureStore from 'expo-secure-store';
import { predictRisk, analyzeCycleHistory } from '../engine/RandomForestRiskEngine';
import { addToSyncQueue, getVillageCode } from './storageService';
import { getPeriodData } from '../utils/storage';

const KEYS = {
  DAILY_LOGS: 'aurahealth_daily_logs',
  USER_PROFILE: 'aurahealth_user_profile',
  RISK_HISTORY: 'aurahealth_risk_history',
  SYMPTOMS_LOG: 'aurahealth_symptoms_log',
};

/**
 * User health profile for risk assessment
 * @typedef {Object} UserProfile
 * @property {number} age - User's age
 * @property {number} height - Height in cm
 * @property {number} weight - Weight in kg
 * @property {number} bmi - Calculated BMI
 */

/**
 * Daily health log entry
 * @typedef {Object} DailyLog
 * @property {string} date - ISO date string
 * @property {number} stress_level - 1-5
 * @property {number} sleep_hours - Hours slept
 * @property {number} exercise_minutes - Minutes of exercise
 * @property {Array<string>} symptoms - Array of symptom codes
 * @property {string} mood - 'happy' | 'neutral' | 'sad'
 * @property {string} [notes] - Optional notes
 */

/**
 * Save or update user profile
 * @param {Object} profile - User profile data
 */
export async function saveUserProfile(profile) {
  try {
    // Merge with existing profile so partial updates don't wipe fields
    let existing = {};
    try {
      const stored = await SecureStore.getItemAsync(KEYS.USER_PROFILE);
      if (stored) existing = JSON.parse(stored);
    } catch (_) {}

    const merged = { ...existing, ...profile };

    // Calculate BMI if height and weight provided
    if (merged.height && merged.weight) {
      const heightInMeters = merged.height / 100;
      merged.bmi = Math.round((merged.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    
    await SecureStore.setItemAsync(KEYS.USER_PROFILE, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    return false;
  }
}

/**
 * Get user profile
 * @returns {Promise<Object|null>} User profile
 */
export async function getUserProfile() {
  try {
    const profile = await SecureStore.getItemAsync(KEYS.USER_PROFILE);
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Clear all health-related data (profile, logs, risk history, symptoms)
 * @returns {Promise<boolean>} Whether the data was cleared successfully
 */
export async function clearHealthData() {
  try {
    await Promise.all(
      Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key))
    );
    return true;
  } catch (error) {
    console.error('Error clearing health data:', error);
    return false;
  }
}

/**
 * Log daily health data
 * @param {DailyLog} logData - Daily health data
 * @returns {Promise<Object>} Saved log with risk assessment
 */
export async function logDailyHealth(logData) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logs = await getDailyLogs();
    
    // Check if already logged today
    const existingIndex = logs.findIndex(log => log.date === today);
    
    const newLog = {
      date: today,
      timestamp: new Date().toISOString(),
      stress_level: logData.stress_level || 3,
      sleep_hours: logData.sleep_hours || 7,
      exercise_minutes: logData.exercise_minutes || 0,
      exercise_freq: Math.min(7, Math.round((logData.exercise_minutes || 0) / 30)), // Convert to freq
      symptoms: logData.symptoms || [],
      mood: logData.mood || 'neutral',
      notes: logData.notes || '',
    };
    
    if (existingIndex >= 0) {
      logs[existingIndex] = { ...logs[existingIndex], ...newLog };
    } else {
      logs.push(newLog);
    }
    
    // Keep only last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const filteredLogs = logs.filter(log => 
      new Date(log.date) > ninetyDaysAgo
    );
    
    await SecureStore.setItemAsync(KEYS.DAILY_LOGS, JSON.stringify(filteredLogs));
    
    // Perform risk assessment
    const riskResult = await performRiskAssessment(newLog);
    
    // Queue for backend sync (unified system)
    const villageCode = await getVillageCode();
    await addToSyncQueue({
      id: Date.now().toString(),
      villageCode: villageCode || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      symptoms: newLog.symptoms || [],
      score: riskResult.confidence ? Math.round(riskResult.confidence * 10) : 5,
      level: riskResult.risk_level || 'Unknown',
    });
    
    return {
      log: newLog,
      risk: riskResult,
    };
  } catch (error) {
    console.error('Error logging daily health:', error);
    throw error;
  }
}

/**
 * Get all daily logs
 * @returns {Promise<Array>} Daily logs
 */
export async function getDailyLogs() {
  try {
    const logs = await SecureStore.getItemAsync(KEYS.DAILY_LOGS);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting daily logs:', error);
    return [];
  }
}

/**
 * Get logs for the past N days
 * @param {number} days - Number of days
 * @returns {Promise<Array>} Recent logs
 */
export async function getRecentLogs(days = 7) {
  const logs = await getDailyLogs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return logs.filter(log => new Date(log.date) >= cutoff);
}

/**
 * Perform risk assessment using Random Forest engine
 * @param {Object} dailyLog - Today's health log
 * @returns {Promise<Object>} Risk assessment result
 */
export async function performRiskAssessment(dailyLog = null) {
  try {
    const profile = await getUserProfile();
    
    if (!profile || !profile.age) {
      return {
        risk_level: 'Unknown',
        message: 'Please complete your profile for risk assessment',
        recommendation_key: 'COMPLETE_PROFILE',
      };
    }
    
    // Get cycle data
    const periodDates = await getPeriodData();
    let cycleAnalysis = { average: 28 }; // Default
    
    if (periodDates && periodDates.length >= 2) {
      // Calculate cycle lengths from period data
      const sortedDates = periodDates
        .map(d => new Date(d))
        .sort((a, b) => a - b);
      
      const cycleLengths = [];
      let lastPeriodStart = sortedDates[0];
      
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = Math.round((sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24));
        if (diff > 7) {
          // New period started
          const cycleLength = Math.round((sortedDates[i] - lastPeriodStart) / (1000 * 60 * 60 * 24));
          if (cycleLength >= 14 && cycleLength <= 90) {
            cycleLengths.push(cycleLength);
          }
          lastPeriodStart = sortedDates[i];
        }
      }
      
      if (cycleLengths.length > 0) {
        cycleAnalysis = analyzeCycleHistory(cycleLengths);
      }
    }
    
    // Get recent logs for averages
    const recentLogs = await getRecentLogs(7);
    
    // Calculate averages from recent logs
    let avgStress = dailyLog?.stress_level || 3;
    let avgSleep = dailyLog?.sleep_hours || 7;
    let avgExercise = dailyLog?.exercise_freq || 3;
    
    if (recentLogs.length > 0) {
      avgStress = recentLogs.reduce((sum, log) => sum + (log.stress_level || 3), 0) / recentLogs.length;
      avgSleep = recentLogs.reduce((sum, log) => sum + (log.sleep_hours || 7), 0) / recentLogs.length;
      avgExercise = recentLogs.reduce((sum, log) => sum + (log.exercise_freq || 0), 0) / recentLogs.length;
    }
    
    // Prepare data for Random Forest
    const userData = {
      age: profile.age,
      bmi: profile.bmi || 22,
      stress_level: Math.round(avgStress),
      sleep_hours: avgSleep,
      exercise_freq: Math.round(avgExercise),
      cycle_length_avg: cycleAnalysis.average || 28,
      cycle_variance: cycleAnalysis.variance,
    };
    
    // Run prediction
    const prediction = predictRisk(userData);
    
    // Save to risk history
    await saveRiskAssessment(prediction);
    
    // Queue for backend sync (unified system)
    const villageCode = await getVillageCode();
    await addToSyncQueue({
      id: 'risk_' + Date.now().toString(),
      villageCode: villageCode || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      symptoms: [],
      score: prediction.confidence ? Math.round(prediction.confidence * 10) : 5,
      level: prediction.risk_level || 'Unknown',
    });
    
    return prediction;
  } catch (error) {
    console.error('Error in risk assessment:', error);
    return {
      risk_level: 'Error',
      message: error.message,
      recommendation_key: 'TRY_AGAIN',
    };
  }
}

/**
 * Get BMI category for anonymization
 * @param {number} bmi - BMI value
 * @returns {string} BMI category
 */
function getBMICategory(bmi) {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

/**
 * Save risk assessment to history
 * @param {Object} assessment - Risk assessment result
 */
async function saveRiskAssessment(assessment) {
  try {
    const history = await getRiskHistory();
    
    history.push({
      timestamp: new Date().toISOString(),
      ...assessment,
    });
    
    // Keep last 100 assessments
    const trimmedHistory = history.slice(-100);
    
    await SecureStore.setItemAsync(KEYS.RISK_HISTORY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Error saving risk history:', error);
  }
}

/**
 * Get risk assessment history
 * @returns {Promise<Array>} Risk history
 */
export async function getRiskHistory() {
  try {
    const history = await SecureStore.getItemAsync(KEYS.RISK_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting risk history:', error);
    return [];
  }
}

/**
 * Log symptoms
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {Array<string>} symptoms - Array of symptom codes
 */
export async function logSymptoms(date, symptoms) {
  try {
    const allSymptoms = await getSymptoms();
    allSymptoms[date] = {
      symptoms,
      timestamp: new Date().toISOString(),
    };
    
    await SecureStore.setItemAsync(KEYS.SYMPTOMS_LOG, JSON.stringify(allSymptoms));
    
    // Queue for backend sync (unified system)
    const villageCode = await getVillageCode();
    await addToSyncQueue({
      id: 'symptom_' + Date.now().toString(),
      villageCode: villageCode || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      symptoms: symptoms,
      score: 0,
      level: 'LOG',
    });
    
    return true;
  } catch (error) {
    console.error('Error logging symptoms:', error);
    return false;
  }
}

/**
 * Get all symptoms logs
 * @returns {Promise<Object>} Symptoms by date
 */
export async function getSymptoms() {
  try {
    const symptoms = await SecureStore.getItemAsync(KEYS.SYMPTOMS_LOG);
    return symptoms ? JSON.parse(symptoms) : {};
  } catch (error) {
    console.error('Error getting symptoms:', error);
    return {};
  }
}

/**
 * Get common symptoms for autocomplete
 * @returns {Array} Common symptom options
 */
export function getSymptomOptions() {
  return [
    { code: 'cramps', en: 'Cramps', hi: 'ऐंठन' },
    { code: 'headache', en: 'Headache', hi: 'सिरदर्द' },
    { code: 'backache', en: 'Back Pain', hi: 'पीठ दर्द' },
    { code: 'bloating', en: 'Bloating', hi: 'पेट फूलना' },
    { code: 'fatigue', en: 'Fatigue', hi: 'थकान' },
    { code: 'mood_swings', en: 'Mood Swings', hi: 'मूड बदलना' },
    { code: 'breast_tenderness', en: 'Breast Tenderness', hi: 'स्तन में दर्द' },
    { code: 'acne', en: 'Acne', hi: 'मुँहासे' },
    { code: 'nausea', en: 'Nausea', hi: 'मतली' },
    { code: 'insomnia', en: 'Insomnia', hi: 'नींद न आना' },
    { code: 'heavy_flow', en: 'Heavy Flow', hi: 'अधिक रक्तस्राव' },
    { code: 'light_flow', en: 'Light Flow', hi: 'कम रक्तस्राव' },
    { code: 'spotting', en: 'Spotting', hi: 'स्पॉटिंग' },
    { code: 'dizziness', en: 'Dizziness', hi: 'चक्कर आना' },
    { code: 'food_cravings', en: 'Food Cravings', hi: 'खाने की तीव्र इच्छा' },
  ];
}

/**
 * Calculate health score from recent data
 * @returns {Promise<Object>} Health score and breakdown
 */
export async function calculateHealthScore() {
  const logs = await getRecentLogs(14);
  const profile = await getUserProfile();
  
  if (logs.length === 0) {
    return {
      score: null,
      message: 'Log at least a few days of data to see your health score',
    };
  }
  
  // Calculate component scores
  const avgSleep = logs.reduce((sum, l) => sum + (l.sleep_hours || 0), 0) / logs.length;
  const avgStress = logs.reduce((sum, l) => sum + (l.stress_level || 3), 0) / logs.length;
  const avgExercise = logs.reduce((sum, l) => sum + (l.exercise_freq || 0), 0) / logs.length;
  
  // Sleep score (7-9 hours optimal)
  let sleepScore = avgSleep >= 7 && avgSleep <= 9 ? 100 : 
                   avgSleep >= 6 && avgSleep <= 10 ? 75 : 
                   avgSleep >= 5 ? 50 : 25;
  
  // Stress score (lower is better)
  let stressScore = (6 - avgStress) * 25; // 1->125, 5->25
  stressScore = Math.min(100, Math.max(0, stressScore));
  
  // Exercise score
  let exerciseScore = Math.min(100, avgExercise * 20);
  
  // BMI score
  let bmiScore = 75; // Default
  if (profile?.bmi) {
    if (profile.bmi >= 18.5 && profile.bmi < 25) bmiScore = 100;
    else if (profile.bmi >= 17 && profile.bmi < 30) bmiScore = 60;
    else bmiScore = 40;
  }
  
  // Overall score (weighted average)
  const overallScore = Math.round(
    sleepScore * 0.3 + 
    stressScore * 0.25 + 
    exerciseScore * 0.25 + 
    bmiScore * 0.2
  );
  
  return {
    score: overallScore,
    breakdown: {
      sleep: Math.round(sleepScore),
      stress: Math.round(stressScore),
      exercise: Math.round(exerciseScore),
      bmi: Math.round(bmiScore),
    },
    averages: {
      sleep_hours: Math.round(avgSleep * 10) / 10,
      stress_level: Math.round(avgStress * 10) / 10,
      exercise_days: Math.round(avgExercise * 10) / 10,
    },
    days_logged: logs.length,
  };
}
