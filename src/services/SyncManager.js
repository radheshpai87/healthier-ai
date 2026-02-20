/**
 * SyncManager - Offline-First Data Synchronization
 * 
 * Handles local data persistence and syncs to backend when online.
 * Uses expo-secure-store for local storage and queues data for sync.
 */

import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { SYNC_CONFIG } from '../utils/constants';

const KEYS = {
  SYNC_QUEUE: 'aurahealth_sync_queue',
  LAST_SYNC: 'aurahealth_last_sync',
  HEALTH_LOGS: 'aurahealth_health_logs',
  DEVICE_ID: 'aurahealth_device_id',
};

// Backend API URL — read dynamically from app.json extra.backendUrl
// (set by start-all.sh / start-mvp-final.sh to your machine's LAN IP at launch)
// Falls back to the hosted Render instance when running outside LAN.
const API_BASE_URL = SYNC_CONFIG.API_BASE_URL;

/**
 * Generate a unique device ID for anonymous sync
 * @returns {Promise<string>} Device ID
 */
async function getOrCreateDeviceId() {
  let deviceId = await SecureStore.getItemAsync(KEYS.DEVICE_ID);
  
  if (!deviceId) {
    // Generate anonymous device ID
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    await SecureStore.setItemAsync(KEYS.DEVICE_ID, deviceId);
  }
  
  return deviceId;
}

/**
 * Check if device is online
 * @returns {Promise<boolean>} Online status
 */
export async function isOnline() {
  try {
    const netState = await NetInfo.fetch();
    return netState.isConnected && netState.isInternetReachable;
  } catch (error) {
    console.warn('NetInfo error:', error);
    return false;
  }
}

/**
 * Get the sync queue
 * @returns {Promise<Array>} Queued items
 */
async function getSyncQueue() {
  try {
    const queue = await SecureStore.getItemAsync(KEYS.SYNC_QUEUE);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
}

/**
 * Save the sync queue
 * @param {Array} queue - Queue items to save
 */
async function saveSyncQueue(queue) {
  try {
    await SecureStore.setItemAsync(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving sync queue:', error);
  }
}

/**
 * Add item to sync queue for later upload
 * @param {string} type - Type of data ('health_log', 'risk_assessment', 'mood_log')
 * @param {Object} data - Data to sync
 */
export async function queueForSync(type, data) {
  const queue = await getSyncQueue();
  const deviceId = await getOrCreateDeviceId();
  
  const queueItem = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
    type,
    data: anonymizeData(data),
    deviceId,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
  
  queue.push(queueItem);
  await saveSyncQueue(queue);
  
  // Try to sync immediately if online
  const online = await isOnline();
  if (online) {
    syncPendingData();
  }
  
  return queueItem.id;
}

/**
 * Anonymize data before syncing
 * Removes any potentially identifying information
 * @param {Object} data - Raw data
 * @returns {Object} Anonymized data
 */
function anonymizeData(data) {
  // Create a copy without sensitive fields
  const anonymized = { ...data };
  
  // Remove any potentially identifying fields
  delete anonymized.name;
  delete anonymized.email;
  delete anonymized.phone;
  delete anonymized.address;
  delete anonymized.userId;
  
  // Round age to nearest 5 for additional privacy
  if (anonymized.age) {
    anonymized.age_group = Math.floor(anonymized.age / 5) * 5;
    delete anonymized.age;
  }
  
  return anonymized;
}

/**
 * Sync all pending data to backend
 * @returns {Promise<Object>} Sync result
 */
export async function syncPendingData() {
  const online = await isOnline();
  
  if (!online) {
    return { 
      success: false, 
      message: 'offline',
      synced: 0,
      pending: (await getSyncQueue()).length,
    };
  }
  
  const queue = await getSyncQueue();
  
  if (queue.length === 0) {
    return { 
      success: true, 
      message: 'no_pending_data',
      synced: 0,
      pending: 0,
    };
  }
  
  let synced = 0;
  const failedItems = [];
  
  for (const item of queue) {
    try {
      const success = await pushToBackend(item);
      
      if (success) {
        synced++;
      } else {
        item.retryCount++;
        if (item.retryCount < 5) {
          failedItems.push(item);
        }
        // Drop items after 5 failed attempts
      }
    } catch (error) {
      console.error('Sync error for item:', item.id, error);
      item.retryCount++;
      if (item.retryCount < 5) {
        failedItems.push(item);
      }
    }
  }
  
  // Save remaining failed items back to queue
  await saveSyncQueue(failedItems);
  
  // Update last sync time
  await SecureStore.setItemAsync(KEYS.LAST_SYNC, new Date().toISOString());
  
  return {
    success: failedItems.length === 0,
    message: 'sync_complete',
    synced,
    pending: failedItems.length,
  };
}

/**
 * Push single item to backend
 * @param {Object} item - Queue item to push
 * @returns {Promise<boolean>} Success status
 */
async function pushToBackend(item) {
  try {
    const response = await fetch(`${API_BASE_URL}/health-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': item.deviceId,
      },
      body: JSON.stringify({
        type: item.type,
        data: item.data,
        timestamp: item.timestamp,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Push to backend failed:', error);
    return false;
  }
}

/**
 * Get sync status information
 * @returns {Promise<Object>} Sync status
 */
export async function getSyncStatus() {
  const queue = await getSyncQueue();
  const lastSync = await SecureStore.getItemAsync(KEYS.LAST_SYNC);
  const online = await isOnline();
  
  return {
    isOnline: online,
    pendingItems: queue.length,
    lastSyncTime: lastSync || null,
    oldestPendingItem: queue.length > 0 ? queue[0].timestamp : null,
  };
}

/**
 * Save health log locally
 * @param {Object} logData - Health log data
 * @returns {Promise<string>} Log ID
 */
export async function saveHealthLog(logData) {
  try {
    const logs = await getHealthLogs();
    
    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...logData,
    };
    
    logs.push(newLog);
    
    // Keep only last 365 days of logs
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const filteredLogs = logs.filter(log => 
      new Date(log.timestamp) > oneYearAgo
    );
    
    await SecureStore.setItemAsync(KEYS.HEALTH_LOGS, JSON.stringify(filteredLogs));
    
    // Queue for sync
    await queueForSync('health_log', newLog);
    
    return newLog.id;
  } catch (error) {
    console.error('Error saving health log:', error);
    throw error;
  }
}

/**
 * Get all local health logs
 * @returns {Promise<Array>} Health logs
 */
export async function getHealthLogs() {
  try {
    const logs = await SecureStore.getItemAsync(KEYS.HEALTH_LOGS);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting health logs:', error);
    return [];
  }
}

/**
 * Get health logs for a specific date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Filtered health logs
 */
export async function getHealthLogsByDateRange(startDate, endDate) {
  const logs = await getHealthLogs();
  
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= startDate && logDate <= endDate;
  });
}

/**
 * Clear all synced data (keeps local data)
 */
export async function clearSyncQueue() {
  await SecureStore.deleteItemAsync(KEYS.SYNC_QUEUE);
}

/**
 * Subscribe to network changes
 * Automatically syncs when coming back online
 * @returns {Function} Unsubscribe function
 */
export function setupAutoSync() {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      // Device came online, try to sync
      syncPendingData().then(result => {
        console.log('Auto-sync result:', result);
      }).catch(err => {
        console.error('Auto-sync error:', err);
      });
    }
  });
  
  return unsubscribe;
}
