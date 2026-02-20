/**
 * syncService.js
 * ─────────────────────────────────────────────
 * Background sync system for AuraHealth.
 *
 * Logic:
 *   1. Check internet connectivity via fetch ping
 *   2. If connected, get all unsynced records
 *   3. POST to backend /api/sync
 *   4. Mark successfully synced records
 *
 * Runs:
 *   - On app launch
 *   - On manual refresh
 *   - On configurable interval
 *
 * All data sent is anonymized — no PII.
 * ─────────────────────────────────────────────
 */

import axios from 'axios';
import { SYNC_CONFIG } from '../utils/constants';
import {
  getSyncQueue,
  updateSyncQueue,
  markRecordSynced,
  saveLastSync,
  getLastSync,
} from './storageService';

// ── Connectivity Check ─────────────────────────

/**
 * Check if the device has internet connectivity
 * by pinging the backend server.
 *
 * @returns {Promise<boolean>}
 */
export async function checkConnectivity() {
  try {
    const response = await axios.get(SYNC_CONFIG.PING_URL, {
      timeout: 5000, // 5 second timeout for rural connectivity
    });
    return response.status === 200;
  } catch (error) {
    // No internet or backend unreachable
    return false;
  }
}

// ── Sync Operations ────────────────────────────

/**
 * Attempt to sync all pending records to the backend.
 * Records that fail are kept in the queue for retry.
 *
 * @returns {Promise<Object>} Sync result summary
 */
export async function syncPendingData() {
  const result = {
    attempted: 0,
    synced: 0,
    failed: 0,
    isOnline: false,
  };

  try {
    // Step 1: Check connectivity
    const isOnline = await checkConnectivity();
    result.isOnline = isOnline;

    if (!isOnline) {
      console.log('[SyncService] Offline — skipping sync');
      return result;
    }

    // Step 2: Get pending records
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      console.log('[SyncService] No pending records to sync');
      return result;
    }

    result.attempted = queue.length;
    console.log(`[SyncService] Syncing ${queue.length} records...`);

    // Step 3: Send records in batch to backend
    try {
      const response = await axios.post(
        `${SYNC_CONFIG.API_BASE_URL}/sync`,
        { records: queue },
        { timeout: 15000 } // 15 second timeout
      );

      if (response.status === 200 || response.status === 201) {
        // Mark all records as synced
        for (const record of queue) {
          await markRecordSynced(record.id);
        }

        // Clear the sync queue
        await updateSyncQueue([]);
        await saveLastSync();

        result.synced = queue.length;
        console.log(`[SyncService] Successfully synced ${queue.length} records`);
      }
    } catch (postError) {
      console.error('[SyncService] Batch sync failed, trying individually...');

      // Step 4: Fallback — try individual records
      const remainingQueue = [];

      for (const record of queue) {
        try {
          await axios.post(
            `${SYNC_CONFIG.API_BASE_URL}/sync`,
            { records: [record] },
            { timeout: 10000 }
          );

          await markRecordSynced(record.id);
          result.synced++;
        } catch (individualError) {
          // Increment retry count
          record.retries = (record.retries || 0) + 1;

          if (record.retries < SYNC_CONFIG.MAX_RETRIES) {
            remainingQueue.push(record);
          } else {
            console.warn(
              `[SyncService] Dropping record ${record.id} after ${SYNC_CONFIG.MAX_RETRIES} retries`
            );
          }
          result.failed++;
        }
      }

      // Update queue with remaining records
      await updateSyncQueue(remainingQueue);

      if (result.synced > 0) {
        await saveLastSync();
      }
    }

    return result;
  } catch (error) {
    console.error('[SyncService] Sync error:', error);
    return result;
  }
}

/**
 * Get current sync status for display.
 *
 * @returns {Promise<Object>} Sync status
 */
export async function getSyncStatus() {
  try {
    const [queue, lastSync, isOnline] = await Promise.all([
      getSyncQueue(),
      getLastSync(),
      checkConnectivity(),
    ]);

    return {
      pendingCount: queue.length,
      lastSync: lastSync || null,
      isOnline,
    };
  } catch (error) {
    console.error('[SyncService] Failed to get sync status:', error);
    return {
      pendingCount: 0,
      lastSync: null,
      isOnline: false,
    };
  }
}

// ── Auto Sync ──────────────────────────────────

let syncIntervalId = null;

/**
 * Start automatic sync on a fixed interval.
 * Call this on app launch.
 */
export function startAutoSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }

  // Initial sync attempt
  syncPendingData().catch((err) =>
    console.error('[SyncService] Initial sync failed:', err)
  );

  // Set up interval
  syncIntervalId = setInterval(() => {
    syncPendingData().catch((err) =>
      console.error('[SyncService] Auto-sync failed:', err)
    );
  }, SYNC_CONFIG.SYNC_INTERVAL_MS);

  console.log(
    `[SyncService] Auto-sync started (every ${SYNC_CONFIG.SYNC_INTERVAL_MS / 1000}s)`
  );
}

/**
 * Stop automatic sync.
 */
export function stopAutoSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[SyncService] Auto-sync stopped');
  }
}
