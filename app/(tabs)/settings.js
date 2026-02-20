import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, Shield, Info, Phone, UserCog, MapPin, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import { translations } from '../../src/constants/translations';
import LanguageSwitch from '../../src/components/LanguageSwitch';
import { clearAllData } from '../../src/utils/storage';
import { clearAllAppData, saveEmergencyContacts, getEmergencyContacts, getRole, saveRole } from '../../src/services/storageService';
import { getSavedLocation, detectLocation, saveLocation, clearSavedLocation } from '../../src/services/locationService';
import { clearHealthData, getUserProfile } from '../../src/services/HealthDataLogger';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen() {
  const { language } = useLanguage();
  const t = translations[language];
  const router = useRouter();

  // Emergency contacts state
  const [ashaNumber, setAshaNumber] = useState('');
  const [familyNumber, setFamilyNumber] = useState('');
  const [contactsSaved, setContactsSaved] = useState(false);
  const [locationDisplay, setLocationDisplay] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const contacts = await getEmergencyContacts();
      if (contacts) {
        setAshaNumber(contacts.ashaNumber || '');
        setFamilyNumber(contacts.familyNumber || '');
      }
      const profile = await getUserProfile();
      setHasProfile(!!(profile && profile.age));
      const loc = await getSavedLocation();
      if (loc) {
        const parts = [loc.name];
        if (loc.district && loc.district !== loc.name) parts.push(loc.district);
        if (loc.state && loc.state !== loc.name && loc.state !== loc.district) parts.push(loc.state);
        setLocationDisplay(parts.join(', '));
      }
    })();
  }, []);

  const handleClearData = () => {
    Alert.alert(
      t.clearDataTitle,
      t.clearDataMessage,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          style: 'destructive',
          onPress: async () => {
            // Clear ALL storage systems + health data + chat + location
            await clearAllData();
            await clearAllAppData();
            await clearHealthData();
            await SecureStore.deleteItemAsync('aurahealth_chat_history').catch(() => {});
            await clearSavedLocation();
            Alert.alert(t.success, t.dataCleared);
            router.replace('/role-select');
          },
        },
      ]
    );
  };

  const handleSaveContacts = async () => {
    await saveEmergencyContacts({
      ashaNumber: ashaNumber.trim(),
      familyNumber: familyNumber.trim(),
    });
    setContactsSaved(true);
    setTimeout(() => setContactsSaved(false), 2000);
    Alert.alert(
      t.success,
      language === 'hi' ? 'आपातकालीन संपर्क सहेजे गए!' : 'Emergency contacts saved!'
    );
  };

  const handleChangeRole = () => {
    Alert.alert(
      language === 'hi' ? 'भूमिका बदलें?' : 'Change Role?',
      language === 'hi'
        ? 'यह आपको भूमिका चयन पृष्ठ पर ले जाएगा। आपका स्वास्थ्य डेटा सुरक्षित रहेगा।'
        : 'This will take you to role selection. Your health data will be preserved.',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          onPress: async () => {
            await saveRole('');
            await clearSavedLocation();
            router.replace('/role-select');
          },
        },
      ]
    );
  };

  const handleRedetectLocation = async () => {
    setIsDetecting(true);
    try {
      const loc = await detectLocation();
      await saveLocation(loc);
      const parts = [loc.name];
      if (loc.district && loc.district !== loc.name) parts.push(loc.district);
      if (loc.state && loc.state !== loc.name && loc.state !== loc.district) parts.push(loc.state);
      setLocationDisplay(parts.join(', '));
      Alert.alert(
        '',
        language === 'hi' ? `स्थान अपडेट किया गया: ${loc.name}` : `Location updated: ${loc.name}`
      );
    } catch (error) {
      const msg = error.message || '';
      if (msg === 'PERMISSION_DENIED') {
        Alert.alert(
          '',
          language === 'hi'
            ? 'स्थान अनुमति आवश्यक है। कृपया फोन सेटिंग में स्थान एक्सेस दें।'
            : 'Location permission required. Please allow location access in phone settings.'
        );
      } else if (msg === 'TIMEOUT' || msg === 'GPS_UNAVAILABLE') {
        Alert.alert(
          '',
          language === 'hi'
            ? 'GPS सिग्नल नहीं मिला। कृपया खुले में जाएं और GPS चालू करें।'
            : 'Could not get GPS signal. Please go outdoors and ensure GPS is turned on.'
        );
      } else {
        Alert.alert(
          '',
          language === 'hi' ? 'स्थान का पता नहीं लगा सका। GPS चालू करें।' : 'Could not detect location. Turn on GPS.'
        );
      }
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.settings}</Text>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.language}</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t.selectLanguage}</Text>
            <LanguageSwitch />
          </View>
        </View>

        {/* Emergency Contacts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'hi' ? 'आपातकालीन संपर्क' : 'Emergency Contacts'}
          </Text>
          <View style={styles.contactCard}>
            <Phone size={20} color="#FFB6C1" />
            <Text style={styles.contactHint}>
              {language === 'hi'
                ? 'ये नंबर आपातकाल में SMS भेजने के लिए उपयोग होंगे'
                : 'These numbers will be used to send emergency SMS'}
            </Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {language === 'hi' ? 'आशा कार्यकर्ता नंबर' : 'ASHA Worker Number'}
            </Text>
            <TextInput
              style={styles.input}
              value={ashaNumber}
              onChangeText={setAshaNumber}
              placeholder={language === 'hi' ? 'नंबर दर्ज करें' : 'Enter phone number'}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {language === 'hi' ? 'परिवार का नंबर' : 'Family Member Number'}
            </Text>
            <TextInput
              style={styles.input}
              value={familyNumber}
              onChangeText={setFamilyNumber}
              placeholder={language === 'hi' ? 'नंबर दर्ज करें' : 'Enter phone number'}
              keyboardType="phone-pad"
            />
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveContacts}>
            <Text style={styles.saveButtonText}>
              {contactsSaved
                ? (language === 'hi' ? '✓ सहेजा गया' : '✓ Saved')
                : (language === 'hi' ? 'संपर्क सहेजें' : 'Save Contacts')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile & Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'hi' ? 'प्रोफ़ाइल और खाता' : 'Profile & Account'}
          </Text>

          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.roleButton}
            onPress={() => router.push('/profile-setup')}
          >
            <User size={20} color="#FFB6C1" />
            <Text style={styles.roleButtonText}>
              {hasProfile
                ? (language === 'hi' ? '✏️ प्रोफ़ाइल संपादित करें' : '✏️ Edit Profile')
                : (language === 'hi' ? '👤 प्रोफ़ाइल बनाएं' : '👤 Set Up Profile')}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 10 }} />

          {/* Current Location */}
          {locationDisplay ? (
            <View style={styles.locationCard}>
              <MapPin size={20} color="#4CAF50" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.locationName}>{locationDisplay}</Text>
                <Text style={styles.locationHint}>
                  {language === 'hi' ? 'आपका वर्तमान स्थान' : 'Your current location'}
                </Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.roleButton, isDetecting && { opacity: 0.5 }]}
            onPress={handleRedetectLocation}
            disabled={isDetecting}
          >
            <MapPin size={20} color="#FFB6C1" />
            <Text style={styles.roleButtonText}>
              {isDetecting
                ? (language === 'hi' ? 'पहचान रहे हैं...' : 'Detecting...')
                : (language === 'hi' ? '📍 स्थान फिर से पहचानें' : '📍 Re-detect Location')}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 10 }} />

          <TouchableOpacity style={styles.roleButton} onPress={handleChangeRole}>
            <UserCog size={20} color="#FFB6C1" />
            <Text style={styles.roleButtonText}>
              {language === 'hi' ? 'भूमिका बदलें (महिला / आशा)' : 'Change Role (Woman / ASHA)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.privacy}</Text>
          <View style={styles.infoCard}>
            <Shield size={24} color="#FFB6C1" />
            <Text style={styles.infoText}>{t.privacyInfo}</Text>
          </View>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <Trash2 size={20} color="#FF6B6B" />
            <Text style={styles.dangerButtonText}>{t.clearAllData}</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.about}</Text>
          <View style={styles.infoCard}>
            <Info size={24} color="#FFB6C1" />
            <View style={styles.aboutContent}>
              <Text style={styles.appVersion}>AuraHealth v1.0.0</Text>
              <Text style={styles.aboutText}>{t.aboutInfo}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  aboutContent: {
    flex: 1,
    marginLeft: 12,
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  dangerButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  // Emergency contacts
  contactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  contactHint: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#FFE4E9',
  },
  saveButton: {
    backgroundColor: '#FFB6C1',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  // Role change
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4E9',
  },
  roleButtonText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },
  // Location display
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FFF8',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});
