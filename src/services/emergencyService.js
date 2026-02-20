/**
 * emergencyService.js
 * ─────────────────────────────────────────────
 * Emergency layer for HIGH risk situations.
 *
 * When risk level === HIGH:
 *   1. Get GPS coordinates via expo-location
 *   2. Send SMS via expo-sms to:
 *      - ASHA worker number
 *      - Family number (if configured)
 *   3. Optionally prompt user to call 112
 *
 * Works 100% without backend / internet.
 * SMS uses device cellular network.
 * ─────────────────────────────────────────────
 */

import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Alert, Linking, Platform } from 'react-native';
import { getEmergencyContacts, getVillageCode } from './storageService';

/**
 * Request location permissions.
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[EmergencyService] Location permission error:', error);
    return false;
  }
}

/**
 * Get current GPS coordinates.
 * Falls back to null if unavailable.
 *
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
export async function getCurrentLocation() {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('[EmergencyService] Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      // Balanced accuracy works better in rural areas with weak GPS
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('[EmergencyService] Failed to get location:', error);
    return null;
  }
}

/**
 * Build emergency SMS message.
 *
 * @param {string} villageCode
 * @param {{latitude: number, longitude: number}|null} location
 * @param {number} riskScore
 * @param {string} language - 'en' | 'hi'
 * @returns {string} Formatted SMS message
 */
export function buildEmergencyMessage(villageCode, location, riskScore, language = 'en') {
  const locationStr = location
    ? `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`
    : 'N/A';

  if (language === 'hi') {
    return (
      `उच्च जोखिम चेतावनी\n` +
      `स्थान: ${villageCode || 'अज्ञात'}\n` +
      `जोखिम स्कोर: ${riskScore}\n` +
      `GPS: ${locationStr}\n` +
      `Google Maps: https://maps.google.com/?q=${locationStr}\n` +
      `तत्काल चिकित्सा सहायता की आवश्यकता है।`
    );
  }

  return (
    `HIGH RISK ALERT\n` +
    `Location: ${villageCode || 'Unknown'}\n` +
    `Risk Score: ${riskScore}\n` +
    `GPS: ${locationStr}\n` +
    `Google Maps: https://maps.google.com/?q=${locationStr}\n` +
    `Immediate medical attention required.`
  );
}

/**
 * Send emergency SMS to configured contacts.
 * Works entirely offline via cellular network.
 *
 * @param {number} riskScore
 * @param {string} [language='en']
 * @returns {Promise<{sent: boolean, message: string}>}
 */
export async function sendEmergencySMS(riskScore, language = 'en') {
  try {
    // Check if SMS is available on this device
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      return {
        sent: false,
        message: language === 'hi'
          ? 'इस डिवाइस पर SMS उपलब्ध नहीं है'
          : 'SMS is not available on this device',
      };
    }

    // Get village code and location in parallel
    const [villageCode, location, contacts] = await Promise.all([
      getVillageCode(),
      getCurrentLocation(),
      getEmergencyContacts(),
    ]);

    // Build recipient list
    const recipients = [];
    if (contacts?.ashaNumber) {
      recipients.push(contacts.ashaNumber);
    }
    if (contacts?.familyNumber) {
      recipients.push(contacts.familyNumber);
    }

    if (recipients.length === 0) {
      return {
        sent: false,
        message: language === 'hi'
          ? 'कोई आपातकालीन संपर्क कॉन्फ़िगर नहीं है। कृपया सेटिंग्स में संपर्क जोड़ें।'
          : 'No emergency contacts configured. Please add contacts in Settings.',
      };
    }

    // Build and send message
    const message = buildEmergencyMessage(villageCode, location, riskScore, language);

    const { result } = await SMS.sendSMSAsync(recipients, message);

    return {
      sent: result === 'sent' || result === 'unknown', // 'unknown' on Android means sent
      message: language === 'hi'
        ? 'आपातकालीन SMS भेजा गया'
        : 'Emergency SMS sent',
    };
  } catch (error) {
    console.error('[EmergencyService] Failed to send SMS:', error);
    return {
      sent: false,
      message: language === 'hi'
        ? 'SMS भेजने में विफल'
        : 'Failed to send SMS',
    };
  }
}

/**
 * Show a prompt to call national emergency number (112).
 * @param {string} [language='en']
 */
export function promptEmergencyCall(language = 'en') {
  const title = language === 'hi' ? 'आपातकालीन कॉल' : 'Emergency Call';
  const message = language === 'hi'
    ? 'क्या आप 112 (आपातकालीन सेवा) पर कॉल करना चाहती हैं?'
    : 'Do you want to call 112 (Emergency Services)?';

  const callLabel = language === 'hi' ? 'कॉल करें' : 'Call 112';
  const cancelLabel = language === 'hi' ? 'रद्द करें' : 'Cancel';

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: callLabel,
      style: 'destructive',
      onPress: () => {
        const phoneUrl = Platform.OS === 'ios' ? 'tel://112' : 'tel:112';
        Linking.openURL(phoneUrl).catch((err) => {
          console.error('[EmergencyService] Failed to open dialer:', err);
        });
      },
    },
  ]);
}

/**
 * Full emergency trigger — sends SMS + prompts call.
 * Called automatically when risk level is HIGH.
 *
 * @param {number} riskScore
 * @param {string} [language='en']
 * @returns {Promise<{smsResult: Object}>}
 */
export async function triggerEmergency(riskScore, language = 'en') {
  // Send SMS first (non-blocking for call prompt)
  const smsResult = await sendEmergencySMS(riskScore, language);

  // Prompt for emergency call
  promptEmergencyCall(language);

  return { smsResult };
}
