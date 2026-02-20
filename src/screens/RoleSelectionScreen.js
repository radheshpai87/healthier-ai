/**
 * RoleSelectionScreen.js
 * ─────────────────────────────────────────────
 * First screen — select role + auto-detect location.
 * Uses GPS + reverse geocoding like Swiggy/Zomato
 * to detect user's village/area automatically.
 * ─────────────────────────────────────────────
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../context/LanguageContext';
import { saveRole } from '../services/storageService';
import { detectLocation, saveLocation } from '../services/locationService';
import { ROLES } from '../utils/constants';

// ── Translations ───────────────────────────────
const t = {
  en: {
    title: 'Welcome to AuraHealth',
    subtitle: 'Select your role to continue',
    womanTitle: '👩 Woman',
    womanDesc: 'Track your health, log symptoms, and get risk assessments',
    ashaTitle: '👩‍⚕️ ASHA Worker',
    ashaDesc: 'Conduct field visits and assess patient health risks',
    detectLocation: '📍 Detect My Location',
    detecting: 'Detecting your location...',
    locationDetected: 'Location detected',
    changeLocation: 'Tap to re-detect',
    continueBtn: 'Continue',
    privacyNote: '🔒 Your privacy is protected. No personal data is collected or shared. Only your area name is stored for health grouping.',
    selectRole: 'Please select a role',
    detectFirst: 'Please detect your location first',
    permissionDenied: 'Location permission is needed to detect your area. Please allow location access in your phone settings.',
    locationFailed: 'Could not detect location. Please check your GPS is turned on and try again.',
  },
  hi: {
    title: 'AuraHealth में आपका स्वागत है',
    subtitle: 'जारी रखने के लिए अपनी भूमिका चुनें',
    womanTitle: '👩 महिला',
    womanDesc: 'अपने स्वास्थ्य को ट्रैक करें, लक्षण दर्ज करें, और जोखिम मूल्यांकन प्राप्त करें',
    ashaTitle: '👩‍⚕️ आशा कार्यकर्ता',
    ashaDesc: 'क्षेत्र दौरे करें और रोगी स्वास्थ्य जोखिम का आकलन करें',
    detectLocation: '📍 मेरा स्थान पहचानें',
    detecting: 'आपका स्थान पहचान रहे हैं...',
    locationDetected: 'स्थान पहचाना गया',
    changeLocation: 'फिर से पहचानने के लिए दबाएं',
    continueBtn: 'जारी रखें',
    privacyNote: '🔒 आपकी गोपनीयता सुरक्षित है। कोई व्यक्तिगत डेटा एकत्र या साझा नहीं किया जाता। केवल स्वास्थ्य समूह के लिए आपके क्षेत्र का नाम संग्रहीत होता है।',
    selectRole: 'कृपया एक भूमिका चुनें',
    detectFirst: 'कृपया पहले अपना स्थान पहचानें',
    permissionDenied: 'आपके क्षेत्र को पहचानने के लिए स्थान अनुमति आवश्यक है। कृपया अपने फोन की सेटिंग में स्थान एक्सेस दें।',
    locationFailed: 'स्थान का पता नहीं लगा सका। कृपया GPS चालू करें और पुनः प्रयास करें।',
  },
};

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { language } = useContext(LanguageContext);
  const lang = language === 'hi' ? 'hi' : 'en';
  const texts = t[lang];

  const [selectedRole, setSelectedRole] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // ── Detect Location (Swiggy-style) ───────────
  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const loc = await detectLocation();
      setLocationData(loc);
      await saveLocation(loc);
    } catch (error) {
      const msg = error.message || '';
      if (msg === 'PERMISSION_DENIED') {
        Alert.alert('', texts.permissionDenied);
      } else if (msg === 'TIMEOUT' || msg === 'GPS_UNAVAILABLE') {
        Alert.alert(
          '',
          lang === 'hi'
            ? 'GPS सिग्नल नहीं मिला। कृपया खुले में जाएं और GPS चालू करें।'
            : 'Could not get GPS signal. Please go outdoors and ensure GPS is turned on.'
        );
      } else {
        Alert.alert('', texts.locationFailed);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // ── Continue ─────────────────────────────────
  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('', texts.selectRole);
      return;
    }
    if (!locationData) {
      Alert.alert('', texts.detectFirst);
      return;
    }

    await saveRole(selectedRole);

    if (selectedRole === ROLES.ASHA) {
      router.replace('/asha');
    } else {
      // Woman role → go to profile setup first
      router.replace('/profile-setup');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={styles.title}>{texts.title}</Text>
        <Text style={styles.subtitle}>{texts.subtitle}</Text>

        {/* Role Cards */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === ROLES.WOMAN && styles.roleCardActive,
          ]}
          onPress={() => setSelectedRole(ROLES.WOMAN)}
          activeOpacity={0.7}
        >
          <Text style={styles.roleTitle}>{texts.womanTitle}</Text>
          <Text style={styles.roleDesc}>{texts.womanDesc}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === ROLES.ASHA && styles.roleCardActive,
          ]}
          onPress={() => setSelectedRole(ROLES.ASHA)}
          activeOpacity={0.7}
        >
          <Text style={styles.roleTitle}>{texts.ashaTitle}</Text>
          <Text style={styles.roleDesc}>{texts.ashaDesc}</Text>
        </TouchableOpacity>

        {/* Location Detection (Swiggy-style) */}
        <TouchableOpacity
          style={[
            styles.locationBtn,
            locationData && styles.locationBtnDetected,
          ]}
          onPress={handleDetectLocation}
          activeOpacity={0.7}
          disabled={isDetecting}
        >
          {isDetecting ? (
            <View style={styles.locationDetecting}>
              <ActivityIndicator size="small" color="#FFB6C1" />
              <Text style={styles.locationDetectingText}>{texts.detecting}</Text>
            </View>
          ) : locationData ? (
            <View style={styles.locationResult}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{locationData.name}</Text>
                <Text style={styles.locationDetail}>
                  {[locationData.district, locationData.state]
                    .filter(Boolean)
                    .join(', ') || locationData.fullAddress}
                </Text>
                <Text style={styles.locationChange}>{texts.changeLocation}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.locationPrompt}>
              <Text style={styles.locationPromptIcon}>📍</Text>
              <Text style={styles.locationPromptText}>{texts.detectLocation}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!selectedRole || !locationData) && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Text style={styles.continueBtnText}>{texts.continueBtn}</Text>
        </TouchableOpacity>

        {/* Privacy Note */}
        <Text style={styles.privacyNote}>{texts.privacyNote}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  container: {
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: '#FFB6C1',
    backgroundColor: '#FFF0F3',
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  roleDesc: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
  },
  // ── Location Button ────────────────────────
  locationBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFB6C1',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  locationBtnDetected: {
    borderStyle: 'solid',
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPromptIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  locationPromptText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFB6C1',
  },
  locationDetecting: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDetectingText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#888',
  },
  locationResult: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  locationIcon: {
    fontSize: 28,
    marginRight: 12,
    marginTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  locationDetail: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  locationChange: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  // ── Continue ───────────────────────────────
  continueBtn: {
    backgroundColor: '#FFB6C1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
});
