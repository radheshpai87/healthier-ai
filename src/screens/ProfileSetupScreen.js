/**
 * ProfileSetupScreen.js
 * ─────────────────────────────────────────────
 * Onboarding profile setup for the "Woman" role.
 * Collects basic health info after role selection
 * before entering the main app.
 *
 * Collects:
 *   - Age
 *   - Height (cm)
 *   - Weight (kg)
 *   - Last period date (optional but helpful)
 *   - Average cycle length (optional)
 *
 * All data stored locally via SecureStore.
 * ─────────────────────────────────────────────
 */

import React, { useState, useContext, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { LanguageContext } from '../context/LanguageContext';
import { saveUserProfile, getUserProfile } from '../services/HealthDataLogger';
import { savePeriodData, getPeriodData } from '../utils/storage';
import { registerUser } from '../services/authService';
import { getRole, saveRole } from '../services/storageService';
import { useAuth } from '../context/AuthContext';

// ── Translations ───────────────────────────────
const t = {
  en: {
    title: 'Set Up Your Profile',
    subtitle: 'Help us personalize your health experience',
    ageLabel: 'Your Age',
    agePlaceholder: 'e.g. 25',
    heightLabel: 'Height (cm)',
    heightPlaceholder: 'e.g. 155',
    weightLabel: 'Weight (kg)',
    weightPlaceholder: 'e.g. 50',
    lastPeriodLabel: 'Last Period Start Date',
    lastPeriodPlaceholder: 'Tap to select date',
    lastPeriodHint: 'This helps predict your next period',
    cycleLengthLabel: 'Average Cycle Length (days)',
    cycleLengthPlaceholder: 'e.g. 28',
    cycleLengthHint: 'Usually 21–35 days. Leave blank if unsure.',
    continueBtn: 'Continue',
    skipBtn: 'Skip for now',
    skipNote: 'You can complete your profile later in Settings or Health tab.',
    privacyNote: 'All data stays on your phone — nothing is uploaded.',
    // Lifestyle
    lifestyleTitle: 'Lifestyle (Optional)',
    lifestyleHint: 'Improves ML-powered health prediction accuracy',
    stressLabel: 'Stress Level',
    stressOptions: ['Low', 'Mild', 'Moderate', 'High', 'Very High'],
    sleepLabel: 'Average Sleep (hours/night)',
    sleepPlaceholder: 'e.g. 7',
    exerciseLabel: 'Exercise (days per week)',
    exercisePlaceholder: 'e.g. 3',
    // Validation
    ageRequired: 'Please enter your age',
    ageInvalid: 'Age must be between 10 and 60',
    heightInvalid: 'Height must be between 100 and 220 cm',
    weightInvalid: 'Weight must be between 20 and 200 kg',
    cycleInvalid: 'Cycle length must be between 14 and 90 days',
    profileSaved: 'Profile saved! Let\'s get started.',
    selectDate: 'Select Date',
    done: 'Done',
  },
  hi: {
    title: 'अपनी प्रोफ़ाइल सेट करें',
    subtitle: 'आपके स्वास्थ्य अनुभव को व्यक्तिगत बनाने में मदद करें',
    ageLabel: 'आपकी आयु',
    agePlaceholder: 'जैसे 25',
    heightLabel: 'ऊंचाई (सेमी)',
    heightPlaceholder: 'जैसे 155',
    weightLabel: 'वजन (किलो)',
    weightPlaceholder: 'जैसे 50',
    lastPeriodLabel: 'अंतिम पीरियड प्रारंभ तिथि',
    lastPeriodPlaceholder: 'तिथि चुनने के लिए दबाएं',
    lastPeriodHint: 'इससे अगले पीरियड का अनुमान लगाने में मदद मिलती है',
    cycleLengthLabel: 'औसत चक्र लंबाई (दिन)',
    cycleLengthPlaceholder: 'जैसे 28',
    cycleLengthHint: 'आमतौर पर 21–35 दिन। अनिश्चित हों तो खाली छोड़ दें।',
    continueBtn: 'जारी रखें',
    skipBtn: 'अभी छोड़ें',
    skipNote: 'आप बाद में सेटिंग्स या स्वास्थ्य टैब में प्रोफ़ाइल पूरी कर सकती हैं।',
    privacyNote: 'सारा डेटा आपके फ़ोन पर ही रहता है — कुछ भी अपलोड नहीं होता।',
    // Lifestyle
    lifestyleTitle: 'जीवनशैली (वैकल्पिक)',
    lifestyleHint: 'ML-संचालित स्वास्थ्य भविष्यवाणी सटीकता बेहतर करता है',
    stressLabel: 'तनाव स्तर',
    stressOptions: ['कम', 'हल्का', 'मध्यम', 'अधिक', 'बहुत अधिक'],
    sleepLabel: 'औसत नींद (घंटे/रात)',
    sleepPlaceholder: 'जैसे 7',
    exerciseLabel: 'व्यायाम (दिन/सप्ताह)',
    exercisePlaceholder: 'जैसे 3',
    // Validation
    ageRequired: 'कृपया अपनी आयु दर्ज करें',
    ageInvalid: 'आयु 10 से 60 के बीच होनी चाहिए',
    heightInvalid: 'ऊंचाई 100 से 220 सेमी के बीच होनी चाहिए',
    weightInvalid: 'वजन 20 से 200 किलो के बीच होना चाहिए',
    cycleInvalid: 'चक्र लंबाई 14 से 90 दिन के बीच होनी चाहिए',
    profileSaved: 'प्रोफ़ाइल सहेजी गई! चलिए शुरू करते हैं।',
    selectDate: 'तिथि चुनें',
    done: 'हो गया',
  },
};

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { language } = useContext(LanguageContext);
  const { refreshUser } = useAuth();
  const lang = language === 'hi' ? 'hi' : 'en';
  const texts = t[lang];

  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [cycleLength, setCycleLength] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Lifestyle fields (for ML model)
  const [stressLevel, setStressLevel] = useState(0); // 0 = not set, 1-5
  const [sleepHours, setSleepHours] = useState('');
  const [exerciseFreq, setExerciseFreq] = useState('');

  // PIN creation state (only shown for new registrations)
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinStep, setPinStep] = useState(1); // 1 = create, 2 = confirm
  const [pinError, setPinError] = useState('');
  // Holds profile + period data until user ID is assigned
  const [pendingProfileData, setPendingProfileData] = useState(null);

  // Pre-fill existing profile data when editing
  useEffect(() => {
    (async () => {
      try {
        const profile = await getUserProfile();
        if (profile && profile.age) {
          setAge(String(profile.age));
          if (profile.height) setHeight(String(profile.height));
          if (profile.weight) setWeight(String(profile.weight));
          if (profile.avgCycleLength) setCycleLength(String(profile.avgCycleLength));
          if (profile.stress_level) setStressLevel(profile.stress_level);
          if (profile.sleep_hours) setSleepHours(String(profile.sleep_hours));
          if (profile.exercise_freq) setExerciseFreq(String(profile.exercise_freq));
          setIsEditing(true);
        }
        const periodDates = await getPeriodData();
        if (periodDates && periodDates.length > 0) {
          // Show the most recent period date
          const sorted = [...periodDates].sort();
          setLastPeriodDate(sorted[sorted.length - 1]);
        }
      } catch (e) {
        // Ignore — fresh install / first time
      }
    })();
  }, []);

  // ── Validation ───────────────────────────────
  const validate = (skipOptional = false) => {
    const newErrors = {};

    // Age is required
    if (!age.trim()) {
      newErrors.age = texts.ageRequired;
    } else {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 10 || ageNum > 60) {
        newErrors.age = texts.ageInvalid;
      }
    }

    // Height — optional but validated if entered
    if (height.trim()) {
      const h = parseFloat(height);
      if (isNaN(h) || h < 100 || h > 220) {
        newErrors.height = texts.heightInvalid;
      }
    }

    // Weight — optional but validated if entered
    if (weight.trim()) {
      const w = parseFloat(weight);
      if (isNaN(w) || w < 20 || w > 200) {
        newErrors.weight = texts.weightInvalid;
      }
    }

    // Cycle length — optional but validated if entered
    if (cycleLength.trim()) {
      const cl = parseInt(cycleLength, 10);
      if (isNaN(cl) || cl < 14 || cl > 90) {
        newErrors.cycleLength = texts.cycleInvalid;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save & Continue ──────────────────────────
  const handleContinue = async () => {
    if (!validate()) return;

    try {
      const profile = {
        age: parseInt(age, 10),
      };

      if (height.trim()) profile.height = parseFloat(height);
      if (weight.trim()) profile.weight = parseFloat(weight);
      if (cycleLength.trim()) profile.avgCycleLength = parseInt(cycleLength, 10);
      if (stressLevel > 0) profile.stress_level = stressLevel;
      if (sleepHours.trim()) profile.sleep_hours = parseFloat(sleepHours);
      if (exerciseFreq.trim()) profile.exercise_freq = parseInt(exerciseFreq, 10);

      if (isEditing) {
        // When editing, user already has an ID — save immediately (scoped)
        await saveUserProfile(profile);

        if (lastPeriodDate) {
          const existing = await getPeriodData();
          const allDates = new Set(Array.isArray(existing) ? existing : []);
          allDates.add(lastPeriodDate);
          await savePeriodData([...allDates]);
        }
        // When editing from Settings/Home, go back
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      } else {
        // New user — stash profile data, show PIN creation
        setPendingProfileData({ profile, lastPeriodDate });
        setShowPinSetup(true);
      }
    } catch (error) {
      console.error('[ProfileSetup] Save failed:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  // ── Skip ─────────────────────────────────────
  const handleSkip = () => {
    // Skip is only valid when editing an existing profile (acts as Cancel)
    if (isEditing) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    }
    // New users must complete PIN setup to enable login/session remembering
  };

  // ── PIN Creation (new user registration) ──
  const handlePinDigit = (digit) => {
    if (pinStep === 1) {
      const next = pin1 + digit;
      if (next.length <= 4) setPin1(next);
      if (next.length === 4) setPinStep(2);
    } else {
      const next = pin2 + digit;
      if (next.length <= 4) setPin2(next);
      if (next.length === 4) confirmPin(next);
    }
  };

  const handlePinDelete = () => {
    if (pinStep === 1) setPin1((p) => p.slice(0, -1));
    else setPin2((p) => p.slice(0, -1));
  };

  const confirmPin = async (confirmedPin) => {
    if (pin1 !== confirmedPin) {
      setPinError(lang === 'hi' ? 'PIN मेल नहीं खाता। पुनः प्रयास करें।' : 'PINs do not match. Try again.');
      setPin1('');
      setPin2('');
      setPinStep(1);
      return;
    }
    try {
      const role = await getRole();
      // registerUser sets _currentUserId so all storage calls below use scoped keys
      await registerUser({
        name: displayName.trim() || (lang === 'hi' ? 'उपयोगकर्ता' : 'User'),
        role: role || 'woman',
        pin: confirmedPin,
      });
      // Re-save role to the now-active scoped key
      await saveRole(role || 'woman');

      // Save profile + period data under the new user-scoped keys
      if (pendingProfileData) {
        await saveUserProfile(pendingProfileData.profile);
        if (pendingProfileData.lastPeriodDate) {
          await savePeriodData([pendingProfileData.lastPeriodDate]);
        }
      }

      // Hydrate AuthContext so settings/header show the user immediately
      await refreshUser();

      router.replace('/(tabs)');
    } catch (err) {
      console.error('[ProfileSetup] registerUser failed:', err);
      router.replace('/(tabs)');
    }
  };

  // ── Date Selection ───────────────────────────
  const handleDateSelect = (day) => {
    const selected = day.dateString;
    const today = new Date().toISOString().split('T')[0];

    // Don't allow future dates
    if (selected > today) {
      return;
    }

    setLastPeriodDate(selected);
    setShowDatePicker(false);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.title}>
            {isEditing
              ? (lang === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile')
              : texts.title}
          </Text>
          <Text style={styles.subtitle}>{texts.subtitle}</Text>

          {/* ── Name (for account display, only on new setup) ── */}
          {!isEditing && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {lang === 'hi' ? 'आपका नाम' : 'Your Name'}
              </Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={lang === 'hi' ? 'जैसे प्रिया' : 'e.g. Priya'}
                placeholderTextColor="#BBB"
                maxLength={30}
                returnKeyType="next"
              />
              <Text style={styles.hint}>
                {lang === 'hi'
                  ? 'लॉगिन स्क्रीन पर आपका नाम दिखाई देगा'
                  : 'Shown on the login screen to identify your account'}
              </Text>
            </View>
          )}

          {/* ── Age (Required) ─────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {texts.ageLabel} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.age && styles.inputError]}
              value={age}
              onChangeText={(val) => {
                setAge(val.replace(/[^0-9]/g, ''));
                if (errors.age) setErrors((e) => ({ ...e, age: null }));
              }}
              placeholder={texts.agePlaceholder}
              placeholderTextColor="#BBB"
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="next"
            />
            {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
          </View>

          {/* ── Height ─────────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{texts.heightLabel}</Text>
            <TextInput
              style={[styles.input, errors.height && styles.inputError]}
              value={height}
              onChangeText={(val) => {
                setHeight(val.replace(/[^0-9.]/g, ''));
                if (errors.height) setErrors((e) => ({ ...e, height: null }));
              }}
              placeholder={texts.heightPlaceholder}
              placeholderTextColor="#BBB"
              keyboardType="decimal-pad"
              maxLength={5}
              returnKeyType="next"
            />
            {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
          </View>

          {/* ── Weight ─────────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{texts.weightLabel}</Text>
            <TextInput
              style={[styles.input, errors.weight && styles.inputError]}
              value={weight}
              onChangeText={(val) => {
                setWeight(val.replace(/[^0-9.]/g, ''));
                if (errors.weight) setErrors((e) => ({ ...e, weight: null }));
              }}
              placeholder={texts.weightPlaceholder}
              placeholderTextColor="#BBB"
              keyboardType="decimal-pad"
              maxLength={5}
              returnKeyType="next"
            />
            {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
          </View>

          {/* ── Last Period Date ────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{texts.lastPeriodLabel}</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={lastPeriodDate ? styles.dateText : styles.datePlaceholder}>
                {lastPeriodDate || texts.lastPeriodPlaceholder}
              </Text>
            </TouchableOpacity>
            <Text style={styles.hint}>{texts.lastPeriodHint}</Text>
          </View>

          {/* ── Cycle Length ────────────────── */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{texts.cycleLengthLabel}</Text>
            <TextInput
              style={[styles.input, errors.cycleLength && styles.inputError]}
              value={cycleLength}
              onChangeText={(val) => {
                setCycleLength(val.replace(/[^0-9]/g, ''));
                if (errors.cycleLength) setErrors((e) => ({ ...e, cycleLength: null }));
              }}
              placeholder={texts.cycleLengthPlaceholder}
              placeholderTextColor="#BBB"
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="done"
            />
            <Text style={styles.hint}>{texts.cycleLengthHint}</Text>
            {errors.cycleLength && <Text style={styles.errorText}>{errors.cycleLength}</Text>}
          </View>

          {/* ── Lifestyle Section (Optional) ──── */}
          <View style={styles.lifestyleSection}>
            <Text style={styles.lifestyleTitle}>{texts.lifestyleTitle}</Text>
            <Text style={styles.lifestyleHint}>{texts.lifestyleHint}</Text>

            {/* Stress Level Chips */}
            <Text style={[styles.label, { marginTop: 12 }]}>{texts.stressLabel}</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.chip,
                    stressLevel === val && styles.chipActive,
                  ]}
                  onPress={() => setStressLevel(stressLevel === val ? 0 : val)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      stressLevel === val && styles.chipTextActive,
                    ]}
                  >
                    {texts.stressOptions[val - 1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sleep Hours */}
            <Text style={[styles.label, { marginTop: 12 }]}>{texts.sleepLabel}</Text>
            <TextInput
              style={styles.input}
              value={sleepHours}
              onChangeText={(val) => setSleepHours(val.replace(/[^0-9.]/g, ''))}
              placeholder={texts.sleepPlaceholder}
              placeholderTextColor="#BBB"
              keyboardType="decimal-pad"
              maxLength={4}
              returnKeyType="next"
            />

            {/* Exercise Frequency */}
            <Text style={[styles.label, { marginTop: 12 }]}>{texts.exerciseLabel}</Text>
            <TextInput
              style={styles.input}
              value={exerciseFreq}
              onChangeText={(val) => setExerciseFreq(val.replace(/[^0-9]/g, ''))}
              placeholder={texts.exercisePlaceholder}
              placeholderTextColor="#BBB"
              keyboardType="number-pad"
              maxLength={1}
              returnKeyType="done"
            />
          </View>

          {/* ── Continue Button ─────────────── */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={0.7}
          >
            <Text style={styles.continueBtnText}>
              {isEditing
                ? (lang === 'hi' ? 'सहेजें' : 'Save')
                : texts.continueBtn}
            </Text>
          </TouchableOpacity>

          {/* ── New-user hint ─────────────────────────────────── */}
          {!isEditing && (
            <Text style={styles.skipNote}>
              {lang === 'hi'
                ? 'अगली स्क्रीन पर एक PIN बनाएं ताकि आप बाद में वापस लॉग इन कर सकें।'
                : 'Next, create a PIN so you can log back in later.'}
            </Text>
          )}

          {/* ── Skip / Cancel Button — only shown when editing ─── */}
          {isEditing && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>
                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Privacy Note */}
          <Text style={styles.privacyNote}>{texts.privacyNote}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* ── PIN Creation Modal ─────────── */}
      <Modal
        visible={showPinSetup}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 32 }]}>
            <Text style={styles.modalTitle}>
              {pinStep === 1
                ? (lang === 'hi' ? '4 अंक PIN बनाएं' : 'Create a 4-digit PIN')
                : (lang === 'hi' ? 'PIN की पुष्टि करें' : 'Confirm your PIN')}
            </Text>
            <Text style={{ color: '#999', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
              {lang === 'hi'
                ? 'यह PIN आपके खाते को सुरक्षित रखता है'
                : 'This PIN protects your account on this device'}
            </Text>

            {/* Dots */}
            <View style={pinSetupStyles.dotsRow}>
              {[0, 1, 2, 3].map((i) => {
                const filled = pinStep === 1 ? i < pin1.length : i < pin2.length;
                return (
                  <View key={i} style={[pinSetupStyles.dot, filled && pinSetupStyles.dotFilled]} />
                );
              })}
            </View>

            {pinError ? <Text style={{ color: '#E53935', textAlign: 'center', marginBottom: 8, fontSize: 13 }}>{pinError}</Text> : null}

            {/* Keypad */}
            {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
              <View key={ri} style={pinSetupStyles.row}>
                {row.map((k, ci) => (
                  <TouchableOpacity
                    key={ci}
                    style={[pinSetupStyles.key, k === '' && pinSetupStyles.keyInvisible]}
                    onPress={() => k === '⌫' ? handlePinDelete() : k !== '' ? handlePinDigit(k) : null}
                    disabled={k === ''}
                  >
                    <Text style={pinSetupStyles.keyText}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Modal>
      {/* ── Date Picker Modal ──────────────── */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{texts.selectDate}</Text>
            <Calendar
              onDayPress={handleDateSelect}
              maxDate={today}
              markedDates={
                lastPeriodDate
                  ? {
                      [lastPeriodDate]: {
                        selected: true,
                        selectedColor: '#FFB6C1',
                      },
                    }
                  : {}
              }
              theme={{
                backgroundColor: '#FFF',
                calendarBackground: '#FFF',
                textSectionTitleColor: '#333',
                selectedDayBackgroundColor: '#FFB6C1',
                selectedDayTextColor: '#FFF',
                todayTextColor: '#FFB6C1',
                dayTextColor: '#333',
                textDisabledColor: '#CCC',
                arrowColor: '#FFB6C1',
                monthTextColor: '#333',
              }}
            />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalCloseBtnText}>{texts.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginTop: 4,
    marginLeft: 4,
  },
  hint: {
    fontSize: 13,
    color: '#AAA',
    marginTop: 4,
    marginLeft: 4,
  },
  lifestyleSection: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFE4E9',
  },
  lifestyleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#555',
    marginBottom: 2,
  },
  lifestyleHint: {
    fontSize: 12,
    color: '#BBB',
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  chipActive: {
    borderColor: '#FFB6C1',
    backgroundColor: '#FFE4E9',
  },
  chipText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#C2185B',
    fontWeight: '600',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#BBB',
  },
  continueBtn: {
    backgroundColor: '#FFB6C1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  skipBtnText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  skipNote: {
    fontSize: 12,
    color: '#BBB',
    textAlign: 'center',
    marginBottom: 16,
  },
  privacyNote: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  // ── Modal Styles ─────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalCloseBtn: {
    backgroundColor: '#FFB6C1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

const pinSetupStyles = StyleSheet.create({
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C2185B',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#C2185B',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB6C1',
  },
  keyInvisible: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#333',
  },
});
