/**
 * locationService.js
 * ─────────────────────────────────────────────
 * GPS-based location detection with reverse geocoding.
 * Works like Swiggy/Zomato — auto-detects user's area
 * name from GPS coordinates.
 *
 * Uses expo-location for:
 *   1. Permission handling
 *   2. GPS coordinates
 *   3. Reverse geocoding (coords → address)
 *
 * Stores: area/village name + coordinates
 * ─────────────────────────────────────────────
 */

import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../utils/constants';

const LOCATION_KEY = 'aura_user_location';

/**
 * Request location permissions (foreground only).
 * @returns {Promise<boolean>}
 */
export async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[LocationService] Permission error:', error);
    return false;
  }
}

/**
 * Detect current location and reverse-geocode to get area name.
 * Returns a structured location object.
 *
 * @returns {Promise<Object>} { name, area, city, district, state, coords }
 */
export async function detectLocation() {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('PERMISSION_DENIED');
  }

  // Helper: race a promise against a timeout
  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), ms)
      ),
    ]);

  let latitude, longitude;

  try {
    // Try last-known position first (instant, works offline)
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      latitude = lastKnown.coords.latitude;
      longitude = lastKnown.coords.longitude;
    }
  } catch (_) {
    // Ignore — will fall through to live GPS
  }

  // If no cached position, get a live GPS fix with timeout
  if (latitude == null) {
    try {
      const position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        20000 // 20s hard timeout
      );
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch (posError) {
      // One more try with lower accuracy (faster on weak-GPS devices)
      try {
        const position = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          }),
          15000
        );
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (_) {
        throw new Error('GPS_UNAVAILABLE');
      }
    }
  }

  // Reverse geocode to get readable address
  let address = {};
  try {
    const geocoded = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      10000
    );
    address = (geocoded && geocoded[0]) || {};
  } catch (geoError) {
    console.warn('[LocationService] Reverse geocode failed:', geoError);
    // Continue without address — we still have coordinates
  }

  // Build a readable location name from best available fields
  // Priority: subLocality > city > district > region
  const name = address.subLocality
    || address.city
    || address.district
    || address.region
    || address.name
    || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

  const locationData = {
    name,                                // "Rampur" or "Lucknow"
    area: address.subLocality || '',      // Sub-locality / neighborhood
    city: address.city || '',             // City name
    district: address.district || '',     // District
    state: address.region || '',          // State
    pincode: address.postalCode || '',    // PIN code
    fullAddress: [
      address.name,
      address.street,
      address.subLocality,
      address.city,
      address.district,
      address.region,
      address.postalCode,
    ].filter(Boolean).join(', '),
    coords: { latitude, longitude },
  };

  return locationData;
}

/**
 * Save detected location to secure storage.
 * @param {Object} locationData
 */
export async function saveLocation(locationData) {
  try {
    await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(locationData));
    // Also save the name as village code for backward compatibility
    await SecureStore.setItemAsync(
      STORAGE_KEYS.VILLAGE_CODE,
      (locationData.district || locationData.city || locationData.name || 'UNKNOWN').toUpperCase()
    );
  } catch (error) {
    console.error('[LocationService] Failed to save location:', error);
  }
}

/**
 * Get saved location.
 * @returns {Promise<Object|null>}
 */
export async function getSavedLocation() {
  try {
    const data = await SecureStore.getItemAsync(LOCATION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[LocationService] Failed to get location:', error);
    return null;
  }
}

/**
 * Get a short display string for the location.
 * e.g. "Rampur, Uttar Pradesh"
 *
 * @returns {Promise<string>}
 */
export async function getLocationDisplayName() {
  const loc = await getSavedLocation();
  if (!loc) return null;

  const parts = [loc.name];
  if (loc.state && loc.state !== loc.name) parts.push(loc.state);
  return parts.join(', ');
}

/**
 * Clear saved location.
 */
export async function clearSavedLocation() {
  try {
    await SecureStore.deleteItemAsync(LOCATION_KEY);
  } catch (error) {
    console.error('[LocationService] Failed to clear location:', error);
  }
}
