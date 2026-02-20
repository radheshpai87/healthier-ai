/**
 * storageService.js
 * ─────────────────────────────────────────────
 * Offline encrypted storage for health records.
 *
 * Uses:
 *   - expo-secure-store for sensitive data
 *   - @react-native-async-storage/async-storage
 *     for anonymized bulk records
 *
 * Privacy rules:
 *   - NO names stored
 *   - NO phone numbers stored
 *   - NO Aadhaar / ID numbers
 *   - NO exact addresses
 *   - Only villageCode for location grouping
 * ─────────────────────────────────────────────
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

// ── Helpers ────────────────────────────────────

/**
 * Generate a unique ID (simple UUID-like).
 * @returns {string}
 */
function generateId() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 9)
  );
}

// ── Secure Store (Sensitive Data) ──────────────

/**
 * Save the user's selected role.
 * @param {string} role - 'woman' | 'asha'
 */
export async function saveRole(role) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.ROLE, role);
  } catch (error) {
    console.error('[StorageService] Failed to save role:', error);
  }
}

/**
 * Get the user's selected role.
 * @returns {Promise<string|null>}
 */
export async function getRole() {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ROLE);
  } catch (error) {
    console.error('[StorageService] Failed to get role:', error);
    return null;
  }
}

/**
 * Save the village code.
 * @param {string} code
 */
export async function saveVillageCode(code) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.VILLAGE_CODE, code);
  } catch (error) {
    console.error('[StorageService] Failed to save village code:', error);
  }
}

/**
 * Get the village code.
 * @returns {Promise<string|null>}
 */
export async function getVillageCode() {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.VILLAGE_CODE);
  } catch (error) {
    console.error('[StorageService] Failed to get village code:', error);
    return null;
  }
}

/**
 * Save emergency contacts securely.
 * @param {Object} contacts - { ashaNumber, familyNumber }
 */
export async function saveEmergencyContacts(contacts) {
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.EMERGENCY_CONTACTS,
      JSON.stringify(contacts)
    );
  } catch (error) {
    console.error('[StorageService] Failed to save contacts:', error);
  }
}

/**
 * Get emergency contacts.
 * @returns {Promise<Object|null>}
 */
export async function getEmergencyContacts() {
  try {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.EMERGENCY_CONTACTS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[StorageService] Failed to get contacts:', error);
    return null;
  }
}

// ── AsyncStorage (Anonymized Health Records) ───

/**
 * Save a health assessment record locally.
 * Record is anonymized — only villageCode, no PII.
 *
 * @param {Object} record
 * @param {string} record.villageCode
 * @param {Object} record.symptoms
 * @param {Object} record.emergency
 * @param {number} record.score
 * @param {string} record.level
 * @returns {Promise<Object>} The saved record with id and timestamp
 */
export async function saveHealthRecord(record) {
  try {
    const existing = await getHealthRecords();

    const newRecord = {
      id: generateId(),
      villageCode: record.villageCode || 'UNKNOWN',
      timestamp: new Date().toISOString(),
      symptoms: record.symptoms || {},
      emergency: record.emergency || {},
      score: record.score,
      level: record.level,
      synced: false,
    };

    existing.push(newRecord);

    await AsyncStorage.setItem(
      STORAGE_KEYS.HEALTH_RECORDS,
      JSON.stringify(existing)
    );

    // Also add to sync queue
    await addToSyncQueue(newRecord);

    return newRecord;
  } catch (error) {
    console.error('[StorageService] Failed to save health record:', error);
    throw error;
  }
}

/**
 * Get all locally stored health records.
 * @returns {Promise<Array>}
 */
export async function getHealthRecords() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HEALTH_RECORDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[StorageService] Failed to get health records:', error);
    return [];
  }
}

/**
 * Add a record to the sync queue.
 * @param {Object} record
 */
export async function addToSyncQueue(record) {
  try {
    const queue = await getSyncQueue();

    queue.push({
      id: record.id,
      villageCode: record.villageCode,
      timestamp: record.timestamp,
      symptoms: record.symptoms,
      score: record.score,
      level: record.level,
      retries: 0,
    });

    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('[StorageService] Failed to add to sync queue:', error);
  }
}

/**
 * Get all records waiting to be synced.
 * @returns {Promise<Array>}
 */
export async function getSyncQueue() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[StorageService] Failed to get sync queue:', error);
    return [];
  }
}

/**
 * Update the sync queue (e.g., after removing synced items).
 * @param {Array} queue
 */
export async function updateSyncQueue(queue) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('[StorageService] Failed to update sync queue:', error);
  }
}

/**
 * Mark a health record as synced.
 * @param {string} recordId
 */
export async function markRecordSynced(recordId) {
  try {
    const records = await getHealthRecords();
    const updated = records.map((r) =>
      r.id === recordId ? { ...r, synced: true } : r
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.HEALTH_RECORDS,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error('[StorageService] Failed to mark record synced:', error);
  }
}

/**
 * Save last sync timestamp.
 */
export async function saveLastSync() {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_SYNC,
      new Date().toISOString()
    );
  } catch (error) {
    console.error('[StorageService] Failed to save last sync:', error);
  }
}

/**
 * Get last sync timestamp.
 * @returns {Promise<string|null>}
 */
export async function getLastSync() {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch (error) {
    console.error('[StorageService] Failed to get last sync:', error);
    return null;
  }
}

/**
 * Save ASHA worker visit records.
 * @param {Object} visit
 */
export async function saveASHAVisit(visit) {
  try {
    const visits = await getASHAVisits();

    visits.push({
      id: generateId(),
      timestamp: new Date().toISOString(),
      villageCode: visit.villageCode,
      patientsAssessed: visit.patientsAssessed || 0,
      highRiskCount: visit.highRiskCount || 0,
      notes: visit.notes || '',
    });

    await AsyncStorage.setItem(STORAGE_KEYS.ASHA_VISITS, JSON.stringify(visits));
  } catch (error) {
    console.error('[StorageService] Failed to save ASHA visit:', error);
  }
}

/**
 * Get all ASHA worker visit records.
 * @returns {Promise<Array>}
 */
export async function getASHAVisits() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ASHA_VISITS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[StorageService] Failed to get ASHA visits:', error);
    return [];
  }
}

/**
 * Clear all app data (for settings reset).
 */
export async function clearAllAppData() {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ROLE);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.VILLAGE_CODE);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.EMERGENCY_CONTACTS);
    await SecureStore.deleteItemAsync('aura_user_location');
    await AsyncStorage.removeItem(STORAGE_KEYS.HEALTH_RECORDS);
    await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    await AsyncStorage.removeItem(STORAGE_KEYS.ASHA_VISITS);
  } catch (error) {
    console.error('[StorageService] Failed to clear data:', error);
  }
}
