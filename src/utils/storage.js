import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey } from '../services/authService';

const KEYS = {
  PERIOD_DATA: 'aurahealth_period_data',
  MOOD_DATA:   'aurahealth_mood_data',
  LANGUAGE:    'aurahealth_language',
  SYMPTOMS:    'aurahealth_symptoms',
  FLOW_DATA:   'aurahealth_flow_data',
  DAILY_LOGS:  'aurahealth_daily_logs',
};

/** Shorthand: scope a KEYS value to the current user. */
const sk = (key) => scopedKey(key);

/**
 * Generic data getter for secure storage
 * @param {string} key - Key name (without prefix)
 * @returns {Promise<any|null>} - Parsed data or null
 */
export async function getData(key) {
  try {
    const fullKey = sk(`aurahealth_${key}`);
    const data = await AsyncStorage.getItem(fullKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return null;
  }
}

/**
 * Generic data setter for secure storage
 * @param {string} key - Key name (without prefix)
 * @param {any} value - Value to store
 * @returns {Promise<boolean>} - Success status
 */
export async function saveData(key, value) {
  try {
    const fullKey = sk(`aurahealth_${key}`);
    await AsyncStorage.setItem(fullKey, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
    return false;
  }
}

/**
 * Save period dates to secure storage
 * @param {string[]} dates - Array of date strings (YYYY-MM-DD format)
 */
export async function savePeriodData(dates) {
  try {
    await AsyncStorage.setItem(sk(KEYS.PERIOD_DATA), JSON.stringify(dates));
    return true;
  } catch (error) {
    console.error('Error saving period data:', error);
    return false;
  }
}

/**
 * Get period dates from secure storage
 * @returns {Promise<string[]|null>} - Array of date strings or null
 */
export async function getPeriodData() {
  try {
    const data = await AsyncStorage.getItem(sk(KEYS.PERIOD_DATA));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting period data:', error);
    return null;
  }
}

/**
 * Save mood data for a specific date
 * @param {string} date - Date string (YYYY-MM-DD format)
 * @param {string} mood - Mood value ('happy', 'neutral', 'sad')
 */
export async function saveMoodData(date, mood) {
  try {
    const existingData = await getMoodData() || {};
    existingData[date] = mood;
    await AsyncStorage.setItem(sk(KEYS.MOOD_DATA), JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error saving mood data:', error);
    return false;
  }
}

/**
 * Get all mood data from secure storage
 * @returns {Promise<Object|null>} - Object with date keys and mood values
 */
export async function getMoodData() {
  try {
    const data = await AsyncStorage.getItem(sk(KEYS.MOOD_DATA));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting mood data:', error);
    return null;
  }
}

/**
 * Save user's preferred language
 * @param {string} language - Language code ('en' or 'ml')
 */
export async function saveLanguage(language) {
  try {
    await SecureStore.setItemAsync(sk(KEYS.LANGUAGE), language);
    return true;
  } catch (error) {
    console.error('Error saving language:', error);
    return false;
  }
}

/**
 * Get user's preferred language
 * @returns {Promise<string>} - Language code ('en' or 'ml'), defaults to 'en'
 */
export async function getLanguage() {
  try {
    const language = await SecureStore.getItemAsync(sk(KEYS.LANGUAGE));
    return language || 'en';
  } catch (error) {
    console.error('Error getting language:', error);
    return 'en';
  }
}

/**
 * Save symptoms for a specific date
 * @param {string} date - Date string (YYYY-MM-DD format)
 * @param {string[]} symptoms - Array of symptom strings
 */
export async function saveSymptoms(date, symptoms) {
  try {
    const existingData = await getSymptoms() || {};
    existingData[date] = symptoms;
    await AsyncStorage.setItem(sk(KEYS.SYMPTOMS), JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error saving symptoms:', error);
    return false;
  }
}

/**
 * Get all symptoms data from secure storage
 * @returns {Promise<Object|null>} - Object with date keys and symptom arrays
 */
export async function getSymptoms() {
  try {
    const data = await AsyncStorage.getItem(sk(KEYS.SYMPTOMS));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting symptoms:', error);
    return null;
  }
}

/**
 * Save flow intensity for a specific date
 * @param {string} date - Date string (YYYY-MM-DD format)
 * @param {string} flow - Flow intensity ('light', 'medium', 'heavy', 'spotting')
 */
export async function saveFlowData(date, flow) {
  try {
    const existingData = await getFlowData() || {};
    existingData[date] = flow;
    await AsyncStorage.setItem(sk(KEYS.FLOW_DATA), JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error saving flow data:', error);
    return false;
  }
}

/**
 * Get all flow intensity data from storage
 * @returns {Promise<Object|null>} - Object with date keys and flow values
 */
export async function getFlowData() {
  try {
    const data = await AsyncStorage.getItem(sk(KEYS.FLOW_DATA));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting flow data:', error);
    return null;
  }
}

/**
 * Remove flow data for a specific date
 * @param {string} date - Date string (YYYY-MM-DD format)
 */
export async function removeFlowData(date) {
  try {
    const existingData = await getFlowData() || {};
    delete existingData[date];
    await AsyncStorage.setItem(sk(KEYS.FLOW_DATA), JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error removing flow data:', error);
    return false;
  }
}

/**
 * Save a comprehensive daily log for a date
 * @param {string} date - Date string (YYYY-MM-DD format)
 * @param {Object} log - { flow, mood, symptoms[], notes }
 */
export async function saveDailyLog(date, log) {
  try {
    const existingData = await getDailyLogs() || {};
    existingData[date] = { ...((existingData[date]) || {}), ...log, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(sk(KEYS.DAILY_LOGS), JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error saving daily log:', error);
    return false;
  }
}

/**
 * Get all daily logs from storage
 * @returns {Promise<Object|null>} - Object with date keys and log objects
 */
export async function getDailyLogs() {
  try {
    const data = await AsyncStorage.getItem(sk(KEYS.DAILY_LOGS));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting daily logs:', error);
    return null;
  }
}

/**
 * Get daily log for a specific date
 * @param {string} date - Date string (YYYY-MM-DD format)
 * @returns {Promise<Object|null>} - Log object or null
 */
export async function getDailyLog(date) {
  try {
    const allLogs = await getDailyLogs();
    return allLogs ? allLogs[date] || null : null;
  } catch (error) {
    console.error('Error getting daily log:', error);
    return null;
  }
}

/**
 * Clear all stored data (for privacy/reset purposes)
 */
export async function clearAllData() {
  try {
    await Promise.all([
      AsyncStorage.removeItem(sk(KEYS.PERIOD_DATA)),
      AsyncStorage.removeItem(sk(KEYS.MOOD_DATA)),
      AsyncStorage.removeItem(sk(KEYS.SYMPTOMS)),
      AsyncStorage.removeItem(sk(KEYS.FLOW_DATA)),
      AsyncStorage.removeItem(sk(KEYS.DAILY_LOGS)),
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
}
