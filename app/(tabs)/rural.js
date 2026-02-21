/**
 * IVR Rural Mode — Fully Integrated AuraHealth IVR System
 *
 * A phone-style interface with numeric dial-pad, chat-bubble session log,
 * TTS auto-read, and full integration with every AuraHealth system:
 *
 *   • ML-powered risk assessment (enhancedRiskAssessment)
 *   • Health score calculation (calculateHealthScore)
 *   • Daily health logging (logDailyHealth)
 *   • AI advice via Gemini (generateSymptomAdvice, getHealthAdvice)
 *   • Emergency SMS + GPS (triggerEmergency, sendEmergencySMS)
 *   • Location services (getSavedLocation)
 *   • Offline sync (syncPendingData)
 *   • Cycle prediction (useCycleTracker)
 *   • Persistent referral + risk history
 *
 * Menu:
 *   1: Cycle Prediction   2: AI Health Advice   3: Health Tips
 *   4: Symptom Triage (ML)  5: Health Score   6: Daily Log
 *   7: Facilities   8: History   9: Emergency SOS
 *   0: Back   #: End call
 *
 * Designed for low-literacy rural users — number-pad only navigation + TTS.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  Dimensions,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  VolumeX,
  Heart,
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  Moon,
  Brain,
  Dumbbell,
  TrendingUp,
  Shield,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useCycleTracker } from '../../src/hooks/useCycleTracker';
import { getHealthAdvice, generateSymptomAdvice } from '../../src/api/gemini';
import {
  getUserProfile,
  calculateHealthScore,
  logDailyHealth,
  getRiskHistory,
} from '../../src/services/HealthDataLogger';
import {
  enhancedRiskAssessment,
  getActiveSymptomLabels,
} from '../../src/services/riskEngine';
import {
  triggerEmergency,
  sendEmergencySMS,
  getCurrentLocation,
} from '../../src/services/emergencyService';
import { getSavedLocation, getLocationDisplayName } from '../../src/services/locationService';
import {
  saveLastRiskResult,
  getLastRiskResult,
  getEmergencyContacts,
} from '../../src/services/storageService';
import { syncPendingData, getSyncStatus } from '../../src/services/syncService';
import { scopedKey } from '../../src/services/authService';

const { width: SCREEN_W } = Dimensions.get('window');

// ────────────────────────────────────────────────────────
// Facility directory (realistic Indian PHC/CHC data)
// ────────────────────────────────────────────────────────
const FACILITY_DIRECTORY = [
  { name: 'ASHA Sushila Devi',       type: 'ASHA Worker',       lat: 26.8500, lng: 81.8800, phone: '9876543210' },
  { name: 'Sub-Centre Majhgawan',    type: 'Sub-Centre',        lat: 26.8650, lng: 81.8640, phone: '05192-274301' },
  { name: 'PHC Rampur',              type: 'PHC',               lat: 26.9000, lng: 81.8100, phone: '05192-274512' },
  { name: 'CHC Barabanki',           type: 'CHC',               lat: 26.9320, lng: 81.1800, phone: '05248-222017' },
  { name: 'District Hospital Gonda', type: 'District Hospital', lat: 27.1300, lng: 81.9600, phone: '05262-231401' },
];

// ────────────────────────────────────────────────────────
// Haversine distance (km) between two GPS coordinates
// ────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get facilities sorted by real GPS distance from the user.
 * Falls back to static order if GPS is unavailable.
 *
 * @param {Object|null} userCoords - { latitude, longitude } from location service
 * @returns {{ facilities: Array, hasGPS: boolean }}
 */
function getFacilitiesWithDistance(userCoords) {
  if (!userCoords || userCoords.latitude == null) {
    // No GPS — return with default estimated distances
    return {
      facilities: FACILITY_DIRECTORY.map((f, i) => ({ ...f, dist: [0, 2, 5, 12, 22][i] })),
      hasGPS: false,
    };
  }
  const withDist = FACILITY_DIRECTORY.map((f) => ({
    ...f,
    dist: Math.round(haversineKm(userCoords.latitude, userCoords.longitude, f.lat, f.lng) * 10) / 10,
  }));
  withDist.sort((a, b) => a.dist - b.dist);
  return { facilities: withDist, hasGPS: true };
}

/**
 * Find the nearest appropriate facility based on risk level.
 * HIGH → nearest hospital/CHC. MODERATE → nearest PHC+. LOW → nearest ASHA/Sub-Centre.
 * Always sorted by actual GPS distance.
 */
function findNearestFacility(riskLevel, facilitiesWithDist) {
  const typesByLevel = {
    HIGH: ['District Hospital', 'CHC'],
    MODERATE: ['PHC', 'CHC', 'District Hospital'],
    LOW: ['ASHA Worker', 'Sub-Centre', 'PHC'],
  };
  const preferred = typesByLevel[riskLevel] || typesByLevel.LOW;
  // Already sorted by distance — find first matching type
  for (const type of preferred) {
    const match = facilitiesWithDist.find((f) => f.type === type);
    if (match) return match;
  }
  return facilitiesWithDist[0]; // ultimate fallback: closest anything
}

// ────────────────────────────────────────────────────────
// IVR state-machine screens
// ────────────────────────────────────────────────────────
const S = {
  IDLE:               'IDLE',
  CONNECTING:         'CONNECTING',
  MAIN_MENU:          'MAIN_MENU',
  CYCLE:              'CYCLE',
  ADVICE_LOADING:     'ADVICE_LOADING',
  ADVICE_RESULT:      'ADVICE_RESULT',
  TIPS:               'TIPS',
  TRIAGE_SELECT:      'TRIAGE_SELECT',
  TRIAGE_LOADING:     'TRIAGE_LOADING',
  TRIAGE_RESULT:      'TRIAGE_RESULT',
  REFERRAL_CARD:      'REFERRAL_CARD',
  HEALTH_SCORE:       'HEALTH_SCORE',
  DAILY_LOG_STRESS:   'DAILY_LOG_STRESS',
  DAILY_LOG_SLEEP:    'DAILY_LOG_SLEEP',
  DAILY_LOG_EXERCISE: 'DAILY_LOG_EXERCISE',
  DAILY_LOG_DONE:     'DAILY_LOG_DONE',
  FACILITIES:         'FACILITIES',
  HISTORY:            'HISTORY',
  SOS:                'SOS',
};

// ────────────────────────────────────────────────────────
// Triage symptom checklist (mapped to riskEngine fields)
// ────────────────────────────────────────────────────────
const TRIAGE_SYMPTOMS = [
  { id: 'heavyBleeding',   key: '1', en: 'Heavy bleeding',       hi: '\u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0930\u0915\u094D\u0924\u0938\u094D\u0930\u093E\u0935', type: 'symptom' },
  { id: 'fatigue',         key: '2', en: 'Fatigue / tiredness',   hi: '\u0925\u0915\u093E\u0928',                     type: 'symptom' },
  { id: 'dizziness',       key: '3', en: 'Dizziness / fainting',  hi: '\u091A\u0915\u094D\u0915\u0930 \u0906\u0928\u093E', type: 'symptom' },
  { id: 'pain',            key: '4', en: 'Severe pain / cramps',  hi: '\u0924\u0947\u091C\u093C \u0926\u0930\u094D\u0926', type: 'symptom' },
  { id: 'vomiting',        key: '5', en: 'Persistent vomiting',   hi: '\u0932\u0917\u093E\u0924\u093E\u0930 \u0909\u0932\u094D\u091F\u0940', type: 'emergency' },
  { id: 'irregularCycles', key: '6', en: 'Irregular cycles',      hi: '\u0905\u0928\u093F\u092F\u092E\u093F\u0924 \u091A\u0915\u094D\u0930', type: 'symptom' },
  { id: 'lowHb',           key: '7', en: 'Low hemoglobin / Anemia', hi: '\u0916\u0942\u0928 \u0915\u0940 \u0915\u092E\u0940', type: 'symptom' },
  { id: 'fainted',         key: '8', en: 'Fainted / unconscious', hi: '\u092C\u0947\u0939\u094B\u0936 \u0939\u0941\u0908', type: 'emergency' },
];

// ────────────────────────────────────────────────────────
// Health tips (TTS)
// ────────────────────────────────────────────────────────
const HEALTH_TIPS = [
  { en: 'Drink at least 8 glasses of water daily to stay hydrated and reduce fatigue.',
    hi: '\u0939\u0930 \u0926\u093F\u0928 \u0915\u092E \u0938\u0947 \u0915\u092E 8 \u0917\u093F\u0932\u093E\u0938 \u092A\u093E\u0928\u0940 \u092A\u093F\u090F\u0902\u0964 \u0907\u0938\u0938\u0947 \u0925\u0915\u093E\u0928 \u0915\u092E \u0939\u094B\u0924\u0940 \u0939\u0948\u0964' },
  { en: 'Eat green leafy vegetables and jaggery to maintain iron levels and prevent anaemia.',
    hi: '\u0939\u0930\u0940 \u092A\u0924\u094D\u0924\u0947\u0926\u093E\u0930 \u0938\u092C\u094D\u091C\u093C\u093F\u092F\u093E\u0902 \u0914\u0930 \u0917\u0941\u0921\u093C \u0916\u093E\u090F\u0902\u0964 \u0907\u0938\u0938\u0947 \u0916\u0942\u0928 \u0915\u0940 \u0915\u092E\u0940 \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0940\u0964' },
  { en: 'Walk for 30 minutes daily. It helps reduce period pain and improves mood.',
    hi: '\u0930\u094B\u091C\u093C 30 \u092E\u093F\u0928\u091F \u092A\u0948\u0926\u0932 \u091A\u0932\u0947\u0902\u0964 \u0907\u0938\u0938\u0947 \u092E\u093E\u0939\u0935\u093E\u0930\u0940 \u0915\u093E \u0926\u0930\u094D\u0926 \u0915\u092E \u0939\u094B\u0924\u093E \u0939\u0948\u0964' },
  { en: 'Use a clean cloth or sanitary pad. Change every 4-6 hours.',
    hi: '\u092E\u093E\u0939\u0935\u093E\u0930\u0940 \u092E\u0947\u0902 \u0938\u093E\u092B \u0915\u092A\u0921\u093C\u093E \u092F\u093E \u092A\u0948\u0921 \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u0930\u0947\u0902\u0964 \u0939\u0930 4-6 \u0918\u0902\u091F\u0947 \u092C\u0926\u0932\u0947\u0902\u0964' },
  { en: 'If very dizzy, lie down and drink ORS or salted water immediately.',
    hi: '\u0905\u0917\u0930 \u092C\u0939\u0941\u0924 \u091A\u0915\u094D\u0915\u0930 \u0906\u090F \u0924\u094B \u0932\u0947\u091F \u091C\u093E\u090F\u0902 \u0914\u0930 \u0924\u0941\u0930\u0902\u0924 ORS \u092F\u093E \u0928\u092E\u0915-\u092A\u093E\u0928\u0940 \u092A\u093F\u090F\u0902\u0964' },
  { en: 'Take an iron tablet daily if advised by your ASHA worker or doctor.',
    hi: 'ASHA \u0926\u0940\u0926\u0940 \u092F\u093E \u0921\u0949\u0915\u094D\u091F\u0930 \u0928\u0947 \u0915\u0939\u093E \u0939\u094B \u0924\u094B \u0930\u094B\u091C\u093C \u090F\u0915 \u0906\u092F\u0930\u0928 \u0915\u0940 \u0917\u094B\u0932\u0940 \u0932\u0947\u0902\u0964' },
  { en: 'Wash hands with soap before eating and after using the toilet.',
    hi: '\u0916\u093E\u0928\u093E \u0916\u093E\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0914\u0930 \u0936\u094C\u091A\u093E\u0932\u092F \u0915\u0947 \u092C\u093E\u0926 \u0938\u093E\u092C\u0941\u0928 \u0938\u0947 \u0939\u093E\u0925 \u0927\u094B\u090F\u0902\u0964' },
  { en: 'Sleep at least 7-8 hours every night for better health and immunity.',
    hi: '\u0939\u0930 \u0930\u093E\u0924 7-8 \u0918\u0902\u091F\u0947 \u0938\u094B\u090F\u0902\u0964 \u0907\u0938\u0938\u0947 \u0938\u0947\u0939\u0924 \u0914\u0930 \u0907\u092E\u094D\u092F\u0942\u0928\u093F\u091F\u0940 \u0905\u091A\u094D\u091B\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948\u0964' },
];

const EXERCISE_MAP = [0, 10, 30, 60, 90]; // key 1-5 → minutes
const USSD_CODE = '*141#';

// ════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════
export default function RuralIVRScreen() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const cycle = useCycleTracker();
  const logRef = useRef(null);

  const hi = language === 'hi';

  /* ── core state ──────────────────────────────────── */
  const [screen, setScreen] = useState(S.IDLE);
  const [ttsOn, setTtsOn] = useState(true);
  const [loading, setLoading] = useState(false);

  /* ── USSD session log ────────────────────────────── */
  const [sessionLog, setSessionLog] = useState([]);

  /* ── sub-screen data ─────────────────────────────── */
  const [adviceText, setAdviceText] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [triageResult, setTriageResult] = useState(null);
  const [referralHistory, setReferralHistory] = useState([]);
  const [healthScoreData, setHealthScoreData] = useState(null);

  /* ── daily log intermediate values (ref to avoid stale closures) */
  const dailyLogRef = useRef({ stress: 3, sleep: 7, exercise: 30 });

  // ── helpers ──────────────────────────────────────────
  const speak = useCallback(
    (text) => {
      if (!ttsOn) return;
      Speech.stop();
      Speech.speak(text, { language: hi ? 'hi-IN' : 'en-IN', rate: 0.85, pitch: 1.0 });
    },
    [ttsOn, hi],
  );

  const log = useCallback((sender, text) => {
    setSessionLog((prev) => [...prev, { sender, text, ts: Date.now() }]);
  }, []);

  const scrollDown = () =>
    setTimeout(() => logRef.current?.scrollToEnd({ animated: true }), 150);

  const go = useCallback((target) => {
    Vibration.vibrate(40);
    setScreen(target);
    scrollDown();
  }, []);

  // ── persistence ─────────────────────────────────────
  const REFERRAL_KEY = () => scopedKey('aurahealth_ivr_referrals');

  const loadReferralHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(REFERRAL_KEY());
      setReferralHistory(raw ? JSON.parse(raw) : []);
    } catch (_) {}
  };

  const saveReferral = async (ref) => {
    try {
      const updated = [...referralHistory, ref].slice(-50);
      await AsyncStorage.setItem(REFERRAL_KEY(), JSON.stringify(updated));
      setReferralHistory(updated);
    } catch (_) {}
  };

  const dialPhone = (number) => {
    const url = Platform.OS === 'ios' ? `telprompt:${number}` : `tel:${number}`;
    Linking.openURL(url).catch(() => {});
  };

  // ══════════════════════════════════════════════════════
  // Screen effects & handlers
  // ══════════════════════════════════════════════════════

  // ── CONNECTING ──────────────────────────────────────
  useEffect(() => {
    if (screen === S.CONNECTING) {
      Vibration.vibrate([0, 200, 150, 200]);
      const msg = hi
        ? `AuraHealth IVR \u092E\u0947\u0902 \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948, ${user?.name || ''}\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902\u2026`
        : `Welcome to AuraHealth IVR, ${user?.name || ''}. Please wait\u2026`;
      log('SYS', msg);
      speak(msg);
      const t = setTimeout(() => go(S.MAIN_MENU), 2200);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // ── MAIN MENU ───────────────────────────────────────
  useEffect(() => {
    if (screen === S.MAIN_MENU) {
      const menu = hi
        ? '1: \uD83D\uDCC5 \u092E\u093E\u0939\u0935\u093E\u0930\u0940 \u092A\u0942\u0930\u094D\u0935\u093E\u0928\u0941\u092E\u093E\u0928\n2: \uD83E\uDD16 AI \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u0932\u093E\u0939\n3: \uD83D\uDCA1 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u091F\u093F\u092A\u094D\u0938\n4: \uD83E\uDE7A \u0932\u0915\u094D\u0937\u0923 \u091C\u093E\u0901\u091A (ML)\n5: \u2764\uFE0F \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u094D\u0915\u094B\u0930\n6: \uD83D\uDCCB \u0926\u0948\u0928\u093F\u0915 \u0932\u0949\u0917\n7: \uD83C\uDFE5 \u0928\u091C\u093C\u0926\u0940\u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0901\n8: \uD83D\uDCDC \u0907\u0924\u093F\u0939\u093E\u0938\n9: \uD83D\uDEA8 \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 SOS\n0: \u0935\u093E\u092A\u0938  #: \u0915\u0949\u0932 \u0938\u092E\u093E\u092A\u094D\u0924'
        : '1: \uD83D\uDCC5 Cycle Prediction\n2: \uD83E\uDD16 AI Health Advice\n3: \uD83D\uDCA1 Health Tips\n4: \uD83E\uDE7A Symptom Check (ML)\n5: \u2764\uFE0F Health Score\n6: \uD83D\uDCCB Daily Log\n7: \uD83C\uDFE5 Nearby Facilities\n8: \uD83D\uDCDC History\n9: \uD83D\uDEA8 Emergency SOS\n0: Back  #: End call';
      log('IVR', menu);
      speak(
        hi
          ? '1 \u092E\u093E\u0939\u0935\u093E\u0930\u0940, 2 AI \u0938\u0932\u093E\u0939, 3 \u091F\u093F\u092A\u094D\u0938, 4 \u0932\u0915\u094D\u0937\u0923 \u091C\u093E\u0901\u091A, 5 \u0938\u094D\u0915\u094B\u0930, 6 \u0926\u0948\u0928\u093F\u0915 \u0932\u0949\u0917, 7 \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0901, 8 \u0907\u0924\u093F\u0939\u093E\u0938, 9 \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928, \u0939\u0948\u0936 \u0915\u0949\u0932 \u0938\u092E\u093E\u092A\u094D\u0924'
          : 'Press 1 cycle, 2 AI advice, 3 tips, 4 symptom check, 5 health score, 6 daily log, 7 facilities, 8 history, 9 emergency, hash to end',
      );
    }
  }, [screen]);

  // ── Option 1: Cycle prediction ──────────────────────
  useEffect(() => {
    if (screen !== S.CYCLE) return;
    if (cycle.isLoading) return; // wait for data to load

    const date = cycle.nextPeriodDate || (hi ? '\u0905\u091C\u094D\u091E\u093E\u0924' : 'Unknown');
    const days =
      cycle.daysUntilNextPeriod != null
        ? `${cycle.daysUntilNextPeriod} ${hi ? '\u0926\u093F\u0928 \u0936\u0947\u0937' : 'days left'}`
        : hi ? '\u0921\u0947\u091F\u093E \u0905\u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924' : 'Not enough data';
    const len = `${cycle.cycleLength} ${hi ? '\u0926\u093F\u0928 \u0915\u093E \u091A\u0915\u094D\u0930' : 'day cycle'}`;

    const msg = hi
      ? `\uD83D\uDCC5 \u0905\u0917\u0932\u0940 \u092E\u093E\u0939\u0935\u093E\u0930\u0940: ${date}\n\u23F3 ${days}\n\uD83D\uDD04 \u0914\u0938\u0924: ${len}\n\n0: \u0935\u093E\u092A\u0938`
      : `\uD83D\uDCC5 Next period: ${date}\n\u23F3 ${days}\n\uD83D\uDD04 Average: ${len}\n\n0: Back`;
    log('IVR', msg);
    speak(hi ? `\u0905\u0917\u0932\u0940 \u092E\u093E\u0939\u0935\u093E\u0930\u0940 ${date}, ${days}, \u0914\u0938\u0924 ${len}` : `Next period ${date}, ${days}, average ${len}`);
  }, [screen, cycle.isLoading, cycle.nextPeriodDate, cycle.daysUntilNextPeriod, cycle.cycleLength]);

  // ── Option 2: AI advice ─────────────────────────────
  const fetchAdvice = async () => {
    setLoading(true);
    setAdviceText('');
    log('IVR', hi ? '\u23F3 Gemini AI \u0938\u0947 \u0938\u0932\u093E\u0939 \u0932\u0947 \u0930\u0939\u0947 \u0939\u0948\u0902\u2026' : '\u23F3 Fetching advice from Gemini AI\u2026');
    try {
      const profile = await getUserProfile();
      const location = await getLocationDisplayName();
      const score = await calculateHealthScore();
      const prompt = hi
        ? `\u092E\u0948\u0902 ${profile?.age || ''} \u0935\u0930\u094D\u0937 \u0915\u0940 \u0939\u0942\u0901\u0964 \u092E\u0947\u0930\u0947 \u091A\u0915\u094D\u0930 \u0915\u0940 \u0932\u0902\u092C\u093E\u0908 ${cycle.cycleLength} \u0926\u093F\u0928 \u0939\u0948\u0964 ${score?.score ? `\u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u094D\u0915\u094B\u0930: ${score.score}/100\u0964` : ''} ${location ? `\u0938\u094D\u0925\u093E\u0928: ${location}\u0964` : ''} \u0938\u0930\u0932 \u092D\u093E\u0937\u093E \u092E\u0947\u0902 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u0932\u093E\u0939 \u0926\u0947\u0902\u0964 5 \u092A\u0902\u0915\u094D\u0924\u093F\u092F\u094B\u0902 \u0938\u0947 \u091C\u093C\u094D\u092F\u093E\u0926\u093E \u0928\u0939\u0940\u0902\u0964`
        : `I am a ${profile?.age || ''} year old woman with a ${cycle.cycleLength}-day cycle. ${score?.score ? `Health score: ${score.score}/100.` : ''} ${location ? `Location: ${location}.` : ''} Give brief wellness tips in simple language. Max 5 lines.`;
      const result = await getHealthAdvice(prompt, language);
      setAdviceText(result);
      log('AI', result);
      speak(result);
    } catch (e) {
      const err = hi ? '\u0938\u0932\u093E\u0939 \u0932\u094B\u0921 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0940\u0964 \u092C\u093E\u0926 \u092E\u0947\u0902 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964' : 'Could not load advice. Try later.';
      setAdviceText(err);
      log('ERR', err);
      speak(err);
    }
    setLoading(false);
    go(S.ADVICE_RESULT);
  };

  useEffect(() => {
    if (screen === S.ADVICE_LOADING) fetchAdvice();
  }, [screen]);

  // ── Option 3: TTS tips ──────────────────────────────
  const speakCurrentTip = useCallback(
    (idx) => {
      const tip = HEALTH_TIPS[idx];
      const text = hi ? tip.hi : tip.en;
      log('IVR', `\uD83D\uDCA1 (${idx + 1}/${HEALTH_TIPS.length}) ${text}`);
      speak(text);
    },
    [hi, speak, log],
  );

  useEffect(() => {
    if (screen === S.TIPS) speakCurrentTip(tipIndex);
  }, [screen]);

  // ── Option 4: Triage (ML-powered) ──────────────────
  useEffect(() => {
    if (screen === S.TRIAGE_SELECT) {
      const lines = TRIAGE_SYMPTOMS.map(
        (s) => `${s.key}: ${hi ? s.hi : s.en}`,
      ).join('\n');
      log(
        'IVR',
        hi
          ? `\uD83E\uDE7A \u0932\u0915\u094D\u0937\u0923 \u091A\u0941\u0928\u0947\u0902 (\u0928\u0902\u092C\u0930 \u0926\u092C\u093E\u090F\u0902):\n${lines}\n\n* \u0926\u092C\u093E\u090F\u0902: ML \u091C\u093E\u0901\u091A \u091A\u0932\u093E\u090F\u0902\n0: \u0935\u093E\u092A\u0938`
          : `\uD83E\uDE7A Select symptoms (press number):\n${lines}\n\nPress *: Run ML triage\n0: Back`,
      );
      speak(hi ? '\u0905\u092A\u0928\u0947 \u0932\u0915\u094D\u0937\u0923\u094B\u0902 \u0915\u0947 \u0928\u0902\u092C\u0930 \u0926\u092C\u093E\u090F\u0902\u0964 \u092B\u093F\u0930 \u0938\u094D\u091F\u093E\u0930 \u0926\u092C\u093E\u0915\u0930 \u091C\u093E\u0901\u091A \u0915\u0930\u0947\u0902\u0964' : 'Press symptom numbers, then star to run ML triage.');
    }
  }, [screen]);

  const toggleSymptom = (id) =>
    setSelectedSymptoms((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const runTriage = async () => {
    if (selectedSymptoms.length === 0) return;
    setLoading(true);
    go(S.TRIAGE_LOADING);
    log('IVR', hi ? '\u23F3 ML \u091C\u093E\u0901\u091A \u091A\u0932 \u0930\u0939\u0940 \u0939\u0948\u2026' : '\u23F3 Running ML-powered triage\u2026');

    try {
      const profile = await getUserProfile();

      // Build proper symptom/emergency objects for the risk engine
      const symptoms = {};
      const emergencyFlags = {};
      for (const id of selectedSymptoms) {
        const sym = TRIAGE_SYMPTOMS.find((s) => s.id === id);
        if (sym) {
          if (sym.type === 'emergency') emergencyFlags[id] = true;
          else symptoms[id] = true;
        }
      }

      // Run ML-enhanced risk assessment
      const riskResult = await enhancedRiskAssessment({
        symptoms,
        emergency: emergencyFlags,
        profile: profile || {},
        lifestyle: { stress_level: 3, sleep_hours: 7, exercise_freq: 3 },
        language,
      });

      // Get AI advice via Gemini
      let aiAdvice = '';
      try {
        const levelForAdvice = riskResult.level === 'HIGH' ? 'High' : riskResult.level === 'MODERATE' ? 'Medium' : 'Low';
        aiAdvice = await generateSymptomAdvice({
          level: levelForAdvice,
          score: riskResult.score,
          mlConfidence: riskResult.mlConfidence,
          healthGrade: riskResult.healthGrade,
          symptoms,
          emergency: emergencyFlags,
        }, language);
      } catch (_) {
        aiAdvice = hi ? 'AI \u0938\u0932\u093E\u0939 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902\u0964' : 'AI advice unavailable.';
      }

      // Get live GPS → compute real distances → pick nearest appropriate facility
      let userCoords = null;
      let location = null;
      try {
        userCoords = await getCurrentLocation();
        location = await getSavedLocation();
      } catch (_) {
        try { location = await getSavedLocation(); } catch (__) {}
      }
      const { facilities: sortedFacilities } = getFacilitiesWithDistance(userCoords);
      const facility = findNearestFacility(riskResult.level, sortedFacilities);

      const symptomNames = getActiveSymptomLabels(symptoms, emergencyFlags, language).join(', ');

      const result = {
        level: riskResult.level,
        score: riskResult.score,
        message: riskResult.advice,
        aiAdvice,
        symptoms: symptomNames,
        facility: facility || FACILITY_DIRECTORY[0],
        timestamp: new Date().toISOString(),
        userName: user?.name || 'User',
        mlConfidence: riskResult.mlConfidence,
        healthScore: riskResult.healthScore,
        healthGrade: riskResult.healthGrade,
        source: riskResult.source,
        location: location?.name || '',
      };
      setTriageResult(result);
      await saveReferral(result);

      // Save to app's central risk result storage
      await saveLastRiskResult({
        level: riskResult.level === 'HIGH' ? 'High' : riskResult.level === 'MODERATE' ? 'Medium' : 'Low',
        score: riskResult.score,
        symptoms,
        emergency: emergencyFlags,
        mlConfidence: riskResult.mlConfidence,
        healthGrade: riskResult.healthGrade,
        source: riskResult.source,
        savedAt: new Date().toISOString(),
      });

      // Display results
      const levelLabel = riskResult.level === 'HIGH'
        ? (hi ? '\u26A0\uFE0F \u0909\u091A\u094D\u091A \u091C\u094B\u0916\u093F\u092E' : '\u26A0\uFE0F HIGH risk')
        : riskResult.level === 'MODERATE'
          ? (hi ? '\u26A1 \u092E\u0927\u094D\u092F\u092E \u091C\u094B\u0916\u093F\u092E' : '\u26A1 MODERATE risk')
          : (hi ? '\u2705 \u0915\u092E \u091C\u094B\u0916\u093F\u092E' : '\u2705 LOW risk');

      const confText = riskResult.mlConfidence ? `${Math.round(riskResult.mlConfidence * 100)}%` : '';
      const sourceText = riskResult.source === 'ml_api' ? 'ML' : riskResult.source === 'local_fallback' ? 'Offline-ML' : 'Rule';

      log('IVR', `${levelLabel}${confText ? ` (${confText})` : ''} [${sourceText}]\n\n${hi ? '\u0932\u0915\u094D\u0937\u0923' : 'Symptoms'}: ${symptomNames}`);
      log('AI', aiAdvice);
      log('IVR', `\uD83D\uDCCD ${hi ? '\u0930\u0947\u092B\u093C\u0930' : 'Refer'}: ${result.facility.name} \u2014 ${result.facility.phone}`);
      speak(riskResult.advice);

      // If HIGH risk, trigger emergency SMS + call prompt
      if (riskResult.requiresEmergency) {
        try {
          await triggerEmergency(riskResult.score, language);
          log('SOS', hi ? '\uD83D\uDEA8 \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 SMS \u092D\u0947\u091C\u093E \u0917\u092F\u093E' : '\uD83D\uDEA8 Emergency SMS sent');
        } catch (e) {
          log('ERR', hi ? 'SMS \u0928\u0939\u0940\u0902 \u092D\u0947\u091C\u093E \u091C\u093E \u0938\u0915\u093E' : 'Could not send emergency SMS');
        }
      }

      // Try background sync
      try { await syncPendingData(); } catch (_) {}

    } catch (e) {
      log('ERR', e.message);
    }
    setLoading(false);
    go(S.TRIAGE_RESULT);
  };

  // ── Option 5: Health Score ──────────────────────────
  useEffect(() => {
    if (screen !== S.HEALTH_SCORE) return;
    (async () => {
      setLoading(true);
      log('IVR', hi ? '\u23F3 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u094D\u0915\u094B\u0930 \u0915\u0940 \u0917\u0923\u0928\u093E\u2026' : '\u23F3 Calculating health score\u2026');
      try {
        const score = await calculateHealthScore();
        setHealthScoreData(score);

        if (score && score.score != null) {
          const bd = score.breakdown || {};
          const msg = hi
            ? `\u2764\uFE0F \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u094D\u0915\u094B\u0930: ${score.score}/100\n\n\uD83C\uDF19 \u0928\u0940\u0902\u0926: ${bd.sleep || 0}/100\n\uD83E\uDDE0 \u0924\u0928\u093E\u0935: ${bd.stress || 0}/100\n\uD83C\uDFCB\uFE0F \u0935\u094D\u092F\u093E\u092F\u093E\u092E: ${bd.exercise || 0}/100\n\uD83D\uDCC8 BMI: ${bd.bmi || 0}/100\n\n${score.days_logged > 0 ? `\uD83D\uDCC5 ${score.days_logged} ${hi ? '\u0926\u093F\u0928 \u0932\u0949\u0917' : 'days logged'}` : (hi ? '\u0921\u093F\u092B\u093C\u0949\u0932\u094D\u091F \u092E\u093E\u0928 \u2022 \u0932\u0949\u0917 \u0915\u0930\u0947\u0902' : 'Default values \u2022 Log daily for accuracy')}\n\n0: \u0935\u093E\u092A\u0938`
            : `\u2764\uFE0F Health Score: ${score.score}/100\n\n\uD83C\uDF19 Sleep: ${bd.sleep || 0}/100\n\uD83E\uDDE0 Stress: ${bd.stress || 0}/100\n\uD83C\uDFCB\uFE0F Exercise: ${bd.exercise || 0}/100\n\uD83D\uDCC8 BMI: ${bd.bmi || 0}/100\n\n${score.days_logged > 0 ? `\uD83D\uDCC5 ${score.days_logged} days logged` : 'Default values \u2022 Log daily for accuracy'}\n\n0: Back`;
          log('IVR', msg);
          speak(hi ? `\u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u094D\u0915\u094B\u0930 ${score.score} \u0939\u0948 100 \u092E\u0947\u0902 \u0938\u0947` : `Health score is ${score.score} out of 100`);
        } else {
          log('IVR', hi ? '\u0938\u094D\u0915\u094B\u0930 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902\u0964 \u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u092D\u0930\u0947\u0902\u0964\n\n0: \u0935\u093E\u092A\u0938' : 'Score unavailable. Complete your profile.\n\n0: Back');
        }
      } catch (e) {
        log('ERR', e.message);
      }
      setLoading(false);
    })();
  }, [screen]);

  // ── Option 6: Daily Log (voice-guided step-by-step) ─
  useEffect(() => {
    if (screen === S.DAILY_LOG_STRESS) {
      dailyLogRef.current = { stress: 3, sleep: 7, exercise: 30 };
      const msg = hi
        ? `\uD83D\uDCCB \u0926\u0948\u0928\u093F\u0915 \u0932\u0949\u0917\n\n\u0924\u0928\u093E\u0935 \u0938\u094D\u0924\u0930 \u091A\u0941\u0928\u0947\u0902 (1-5):\n1: \u092C\u0939\u0941\u0924 \u0936\u093E\u0902\u0924\n2: \u0936\u093E\u0902\u0924\n3: \u0938\u093E\u092E\u093E\u0928\u094D\u092F\n4: \u0924\u0928\u093E\u0935\u0917\u094D\u0930\u0938\u094D\u0924\n5: \u092C\u0939\u0941\u0924 \u0924\u0928\u093E\u0935\n\n0: \u0935\u093E\u092A\u0938`
        : `\uD83D\uDCCB Daily Log\n\nRate your stress (1-5):\n1: Very calm\n2: Calm\n3: Moderate\n4: Stressed\n5: Very stressed\n\n0: Back`;
      log('IVR', msg);
      speak(hi ? '\u0924\u0928\u093E\u0935 \u0938\u094D\u0924\u0930 \u091A\u0941\u0928\u0947\u0902\u0964 1 \u0938\u0947 5 \u0915\u093E \u0928\u0902\u092C\u0930 \u0926\u092C\u093E\u090F\u0902\u0964' : 'Rate your stress level. Press 1 to 5.');
    }
  }, [screen]);

  useEffect(() => {
    if (screen === S.DAILY_LOG_SLEEP) {
      const msg = hi
        ? `\uD83C\uDF19 \u0915\u0932 \u0930\u093E\u0924 \u0915\u093F\u0924\u0928\u0947 \u0918\u0902\u091F\u0947 \u0938\u094B\u090F?\n\n4-9 \u0926\u092C\u093E\u090F\u0902 (\u0918\u0902\u091F\u0947)\n0 = 10+ \u0918\u0902\u091F\u0947\n\n* : \u0935\u093E\u092A\u0938`
        : `\uD83C\uDF19 Hours of sleep last night?\n\nPress 4-9 (hours)\n0 = 10+ hours\n\n* : Back`;
      log('IVR', msg);
      speak(hi ? '\u0915\u093F\u0924\u0928\u0947 \u0918\u0902\u091F\u0947 \u0938\u094B\u090F? 4 \u0938\u0947 9 \u0926\u092C\u093E\u090F\u0902\u0964' : 'How many hours did you sleep? Press 4 to 9.');
    }
  }, [screen]);

  useEffect(() => {
    if (screen === S.DAILY_LOG_EXERCISE) {
      const msg = hi
        ? `\uD83C\uDFCB\uFE0F \u0906\u091C \u0915\u093E \u0935\u094D\u092F\u093E\u092F\u093E\u092E:\n1: \u0915\u0941\u091B \u0928\u0939\u0940\u0902\n2: 10 \u092E\u093F\u0928\u091F\n3: 30 \u092E\u093F\u0928\u091F\n4: 60 \u092E\u093F\u0928\u091F\n5: 90+ \u092E\u093F\u0928\u091F\n\n0: \u0935\u093E\u092A\u0938`
        : `\uD83C\uDFCB\uFE0F Exercise today:\n1: None\n2: 10 min\n3: 30 min\n4: 60 min\n5: 90+ min\n\n0: Back`;
      log('IVR', msg);
      speak(hi ? '\u0935\u094D\u092F\u093E\u092F\u093E\u092E \u0915\u093E \u0938\u094D\u0924\u0930 \u091A\u0941\u0928\u0947\u0902\u0964' : 'Choose your exercise level.');
    }
  }, [screen]);

  const handleSaveDailyLog = async () => {
    setLoading(true);
    const { stress, sleep, exercise } = dailyLogRef.current;
    try {
      await logDailyHealth({
        stress_level: stress,
        sleep_hours: sleep,
        exercise_minutes: exercise,
        exercise_freq: Math.max(1, Math.round(exercise / 20)),
      });

      const score = await calculateHealthScore();
      const scoreText = score?.score != null ? `${score.score}/100` : (hi ? '\u0905\u0928\u0941\u092A\u0932\u092C\u094D\u0927' : 'N/A');

      log('IVR', hi
        ? `\u2705 \u0932\u0949\u0917 \u0938\u0939\u0947\u091C\u093E!\n\n\u2764\uFE0F \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u094D\u0915\u094B\u0930: ${scoreText}\n\uD83E\uDDE0 \u0924\u0928\u093E\u0935: ${stress}/5\n\uD83C\uDF19 \u0928\u0940\u0902\u0926: ${sleep} \u0918\u0902\u091F\u0947\n\uD83C\uDFCB\uFE0F \u0935\u094D\u092F\u093E\u092F\u093E\u092E: ${exercise} \u092E\u093F\u0928\u091F\n\n0: \u0935\u093E\u092A\u0938`
        : `\u2705 Log saved!\n\n\u2764\uFE0F Health Score: ${scoreText}\n\uD83E\uDDE0 Stress: ${stress}/5\n\uD83C\uDF19 Sleep: ${sleep} hrs\n\uD83C\uDFCB\uFE0F Exercise: ${exercise} min\n\n0: Back`
      );
      speak(hi ? `\u0932\u0949\u0917 \u0938\u0939\u0947\u091C\u093E \u0917\u092F\u093E\u0964 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u094D\u0915\u094B\u0930 ${scoreText}` : `Log saved. Health score ${scoreText}`);

      // Background sync
      try { await syncPendingData(); } catch (_) {}
    } catch (e) {
      log('ERR', e.message);
    }
    setLoading(false);
    go(S.DAILY_LOG_DONE);
  };

  // ── Option 7: Facilities (GPS distance-sorted) ─────
  useEffect(() => {
    if (screen !== S.FACILITIES) return;
    (async () => {
      setLoading(true);
      let locationName = '';
      let userCoords = null;
      try {
        userCoords = await getCurrentLocation();
        locationName = await getLocationDisplayName() || '';
      } catch (_) {
        try { locationName = await getLocationDisplayName() || ''; } catch (__) {}
      }

      const { facilities } = getFacilitiesWithDistance(userCoords);

      const lines = facilities.map(
        (f, i) => `${i + 1}. ${f.name}\n   ${f.type} \u2014 \u260E ${f.phone}`,
      ).join('\n');
      const header = locationName ? `\uD83D\uDCCD ${locationName}\n\n` : '';
      const msg = hi
        ? `\uD83C\uDFE5 ${header}\u0928\u091C\u093C\u0926\u0940\u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0901:\n\n${lines}\n\n0: \u0935\u093E\u092A\u0938`
        : `\uD83C\uDFE5 ${header}Nearby Facilities:\n\n${lines}\n\n0: Back`;
      log('IVR', msg);
      speak(hi ? '\u0928\u091C\u093C\u0926\u0940\u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E\u0913\u0902 \u0915\u0940 \u0938\u0942\u091A\u0940' : 'Showing nearby facility list');
      setLoading(false);
    })();
  }, [screen]);

  // ── Option 8: History (merged IVR + app data) ───────
  useEffect(() => {
    if (screen !== S.HISTORY) return;
    (async () => {
      setLoading(true);
      await loadReferralHistory();

      // Also load app-level risk history
      let appHistory = [];
      try {
        appHistory = await getRiskHistory();
      } catch (_) {}

      let lastResult = null;
      try {
        lastResult = await getLastRiskResult();
      } catch (_) {}

      // Merge all into display
      const items = [];

      // IVR referrals
      if (referralHistory.length > 0) {
        const ivrItems = referralHistory.slice(-5).reverse().map((r, i) => {
          const d = new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN');
          return `${i + 1}. ${d} | ${r.level} | ${r.facility?.name || '\u2014'} | ${r.source || 'IVR'}`;
        }).join('\n');
        items.push(hi ? `\uD83D\uDCDE IVR \u0930\u0947\u092B\u093C\u0930\u0932:\n${ivrItems}` : `\uD83D\uDCDE IVR Referrals:\n${ivrItems}`);
      }

      // App risk assessments
      if (appHistory.length > 0) {
        const appItems = appHistory.slice(-3).reverse().map((r, i) => {
          const d = new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN');
          return `${i + 1}. ${d} | ${r.risk_level || '\u2014'} | ${r.source || 'App'}`;
        }).join('\n');
        items.push(hi ? `\uD83D\uDCCA \u0905\u0928\u0941\u092A\u094D\u0930\u092F\u094B\u0917 \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928:\n${appItems}` : `\uD83D\uDCCA App Assessments:\n${appItems}`);
      }

      // Last symptom check
      if (lastResult) {
        const d = new Date(lastResult.savedAt || Date.now()).toLocaleDateString(hi ? 'hi-IN' : 'en-IN');
        items.push(hi ? `\uD83E\uDE7A \u0905\u0902\u0924\u093F\u092E \u091C\u093E\u0901\u091A: ${d} | ${lastResult.level || '\u2014'}` : `\uD83E\uDE7A Last Check: ${d} | ${lastResult.level || '\u2014'}`);
      }

      if (items.length === 0) {
        log('IVR', hi ? '\uD83D\uDCDC \u0915\u094B\u0908 \u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0928\u0939\u0940\u0902\u0964\n\n0: \u0935\u093E\u092A\u0938' : '\uD83D\uDCDC No records yet.\n\n0: Back');
      } else {
        log('IVR', `\uD83D\uDCDC ${hi ? '\u0907\u0924\u093F\u0939\u093E\u0938' : 'History'}\n\n${items.join('\n\n')}\n\n0: ${hi ? '\u0935\u093E\u092A\u0938' : 'Back'}`);
      }
      setLoading(false);
    })();
  }, [screen]);

  // ── Option 9: SOS (enhanced with emergency service) ─
  useEffect(() => {
    if (screen === S.SOS) {
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
      const sos = hi
        ? '\uD83D\uDEA8 \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928!\n\n1: ASHA \u0926\u0940\u0926\u0940 \u0915\u094B \u0915\u0949\u0932\n2: SMS \u0905\u0932\u0930\u094D\u091F + 108 \u090F\u0902\u092C\u0941\u0932\u0947\u0902\u0938\n3: 112 \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928\n4: GPS \u0938\u094D\u0925\u093E\u0928 \u092D\u0947\u091C\u0947\u0902\n\n0: \u0935\u093E\u092A\u0938'
        : '\uD83D\uDEA8 EMERGENCY!\n\n1: Call ASHA Worker\n2: Send Alert SMS + 108 Ambulance\n3: Call 112 Helpline\n4: Share GPS Location\n\n0: Back';
      log('SOS', sos);
      speak(hi ? '\u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 \u092E\u094B\u0921\u0964 1 ASHA, 2 SMS \u0914\u0930 \u090F\u0902\u092C\u0941\u0932\u0947\u0902\u0938, 3 \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928, 4 GPS' : 'Emergency mode. 1 ASHA, 2 SMS alert and ambulance, 3 helpline, 4 GPS location.');
    }
  }, [screen]);

  const handleSOSAction = async (key) => {
    if (key === '1') {
      // Call ASHA worker from configured contacts
      let ashaNum = '9876543210';
      try {
        const contacts = await getEmergencyContacts();
        if (contacts?.ashaNumber) ashaNum = contacts.ashaNumber;
      } catch (_) {}
      log('SOS', hi ? `\uD83D\uDCDE ASHA \u0915\u0949\u0932: ${ashaNum}` : `\uD83D\uDCDE Calling ASHA: ${ashaNum}`);
      dialPhone(ashaNum);
    } else if (key === '2') {
      // Send emergency SMS via service + call 108
      setLoading(true);
      try {
        const result = await sendEmergencySMS(10, language);
        log('SOS', result.sent
          ? (hi ? '\u2705 \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 SMS \u092D\u0947\u091C\u093E \u0917\u092F\u093E' : '\u2705 Emergency SMS sent')
          : result.message
        );
      } catch (e) {
        log('ERR', hi ? 'SMS \u0928\u0939\u0940\u0902 \u092D\u0947\u091C\u093E \u091C\u093E \u0938\u0915\u093E' : 'Could not send SMS');
      }
      setLoading(false);
      log('SOS', hi ? '\uD83D\uDE91 108 \u090F\u0902\u092C\u0941\u0932\u0947\u0902\u0938 \u0915\u0949\u0932\u2026' : '\uD83D\uDE91 Calling 108 ambulance\u2026');
      dialPhone('108');
    } else if (key === '3') {
      log('SOS', hi ? '\uD83D\uDCDE 112 \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928 \u0915\u0949\u0932\u2026' : '\uD83D\uDCDE Calling 112 helpline\u2026');
      dialPhone('112');
    } else if (key === '4') {
      // Share GPS location via emergency service
      setLoading(true);
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          const mapsUrl = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
          log('SOS', hi
            ? `\uD83D\uDCCD \u0938\u094D\u0925\u093E\u0928: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}\n${mapsUrl}`
            : `\uD83D\uDCCD Location: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}\n${mapsUrl}`
          );
          speak(hi ? '\u0938\u094D\u0925\u093E\u0928 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u0941\u0906\u0964 SMS \u092D\u0947\u091C \u0930\u0939\u0947 \u0939\u0948\u0902\u0964' : 'Location found. Sending SMS.');
          await sendEmergencySMS(10, language);
          log('SOS', hi ? '\u2705 \u0938\u094D\u0925\u093E\u0928 SMS \u092D\u0947\u091C\u093E' : '\u2705 Location SMS sent');
        } else {
          log('ERR', hi ? 'GPS \u0938\u094D\u0925\u093E\u0928 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0928\u0939\u0940\u0902 \u0939\u0941\u0906' : 'Could not get GPS location');
        }
      } catch (e) {
        log('ERR', e.message);
      }
      setLoading(false);
    }
  };

  // ── Referral card ───────────────────────────────────
  useEffect(() => {
    if (screen === S.REFERRAL_CARD && triageResult) {
      const r = triageResult;
      const card = [
        '\u250C\u2500\u2500\u2500\u2500\u2500 REFERRAL CARD \u2500\u2500\u2500\u2500\u2500\u2510',
        `\u2502 ${hi ? '\u0928\u093E\u092E' : 'Name'}: ${r.userName}`,
        `\u2502 ${hi ? '\u0926\u093F\u0928\u093E\u0902\u0915' : 'Date'}: ${new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}`,
        `\u2502 ${hi ? '\u091C\u094B\u0916\u093F\u092E' : 'Risk'}: ${r.level}${r.mlConfidence ? ` (${Math.round(r.mlConfidence * 100)}%)` : ''}`,
        `\u2502 ${hi ? '\u0938\u094D\u0930\u094B\u0924' : 'Source'}: ${r.source || 'IVR'}`,
        `\u2502 ${hi ? '\u0932\u0915\u094D\u0937\u0923' : 'Symptoms'}: ${r.symptoms}`,
        r.location ? `\u2502 ${hi ? '\u0938\u094D\u0925\u093E\u0928' : 'Location'}: ${r.location}` : null,
        '\u2502\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2502',
        `\u2502 ${hi ? '\u0930\u0947\u092B\u093C\u0930' : 'Refer to'}: ${r.facility.name}`,
        `\u2502 ${r.facility.type}`,
        `\u2502 \u260E ${r.facility.phone}`,
        '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
        '',
        hi ? '0: \u0935\u093E\u092A\u0938' : '0: Back',
      ].filter(Boolean).join('\n');
      log('REF', card);
      speak(hi ? `\u0930\u0947\u092B\u093C\u0930\u0932 \u0915\u093E\u0930\u094D\u0921: ${r.facility.name} \u0915\u094B \u0930\u0947\u092B\u093C\u0930 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964` : `Referral card: referred to ${r.facility.name}.`);
    }
  }, [screen]);

  // ══════════════════════════════════════════════════════
  // Dial-pad key handler (the core IVR dispatcher)
  // ══════════════════════════════════════════════════════
  const handleKey = useCallback(
    (key) => {
      Vibration.vibrate(30);
      log('YOU', key);

      // Global hang-up
      if (key === '#') {
        Speech.stop();
        setScreen(S.IDLE);
        setSessionLog([]);
        setSelectedSymptoms([]);
        setTriageResult(null);
        setHealthScoreData(null);
        return;
      }

      switch (screen) {
        case S.IDLE:
          if (key === '*' || key === 'CALL') go(S.CONNECTING);
          break;

        case S.MAIN_MENU:
          if (key === '1') go(S.CYCLE);
          else if (key === '2') go(S.ADVICE_LOADING);
          else if (key === '3') { setTipIndex(0); go(S.TIPS); }
          else if (key === '4') { setSelectedSymptoms([]); go(S.TRIAGE_SELECT); }
          else if (key === '5') go(S.HEALTH_SCORE);
          else if (key === '6') go(S.DAILY_LOG_STRESS);
          else if (key === '7') go(S.FACILITIES);
          else if (key === '8') go(S.HISTORY);
          else if (key === '9') go(S.SOS);
          break;

        case S.CYCLE:
        case S.ADVICE_RESULT:
        case S.FACILITIES:
        case S.HISTORY:
        case S.HEALTH_SCORE:
        case S.DAILY_LOG_DONE:
          if (key === '0') go(S.MAIN_MENU);
          break;

        case S.TIPS:
          if (key === '0') go(S.MAIN_MENU);
          else if (key === '1') {
            const next = (tipIndex + 1) % HEALTH_TIPS.length;
            setTipIndex(next);
            speakCurrentTip(next);
          } else if (key === '2') {
            speakCurrentTip(tipIndex);
          }
          break;

        case S.TRIAGE_SELECT: {
          if (key === '0') go(S.MAIN_MENU);
          else if (key === '*') runTriage();
          else {
            const sym = TRIAGE_SYMPTOMS.find((s) => s.key === key);
            if (sym) {
              toggleSymptom(sym.id);
              const selected = selectedSymptoms.includes(sym.id);
              const label = hi ? sym.hi : sym.en;
              log('IVR', selected ? `\u2796 ${label}` : `\u2795 ${label}`);
            }
          }
          break;
        }

        case S.TRIAGE_RESULT:
          if (key === '0') go(S.MAIN_MENU);
          else if (key === '1' && triageResult) go(S.REFERRAL_CARD);
          else if (key === '2' && triageResult) { speak(triageResult.aiAdvice); }
          break;

        case S.REFERRAL_CARD:
          if (key === '0') go(S.MAIN_MENU);
          break;

        // ── Daily log step-by-step ──────────────────
        case S.DAILY_LOG_STRESS:
          if (key === '0') go(S.MAIN_MENU);
          else if (['1', '2', '3', '4', '5'].includes(key)) {
            const val = parseInt(key);
            dailyLogRef.current.stress = val;
            log('IVR', hi ? `\u0924\u0928\u093E\u0935: ${val}/5` : `Stress: ${val}/5`);
            go(S.DAILY_LOG_SLEEP);
          }
          break;

        case S.DAILY_LOG_SLEEP:
          if (key === '*') go(S.DAILY_LOG_STRESS);
          else if (key === '0') {
            dailyLogRef.current.sleep = 10;
            log('IVR', hi ? `\u0928\u0940\u0902\u0926: 10 \u0918\u0902\u091F\u0947` : 'Sleep: 10 hours');
            go(S.DAILY_LOG_EXERCISE);
          } else if (['4', '5', '6', '7', '8', '9'].includes(key)) {
            const val = parseInt(key);
            dailyLogRef.current.sleep = val;
            log('IVR', hi ? `\u0928\u0940\u0902\u0926: ${val} \u0918\u0902\u091F\u0947` : `Sleep: ${val} hours`);
            go(S.DAILY_LOG_EXERCISE);
          }
          break;

        case S.DAILY_LOG_EXERCISE:
          if (key === '0') go(S.MAIN_MENU);
          else if (['1', '2', '3', '4', '5'].includes(key)) {
            const minutes = EXERCISE_MAP[parseInt(key) - 1];
            dailyLogRef.current.exercise = minutes;
            log('IVR', hi ? `\u0935\u094D\u092F\u093E\u092F\u093E\u092E: ${minutes} \u092E\u093F\u0928\u091F` : `Exercise: ${minutes} min`);
            handleSaveDailyLog();
          }
          break;

        // ── SOS ─────────────────────────────────────
        case S.SOS:
          if (key === '0') go(S.MAIN_MENU);
          else handleSOSAction(key);
          break;

        default:
          break;
      }

      scrollDown();
    },
    [screen, selectedSymptoms, tipIndex, triageResult, hi, go, speak, log],
  );

  // ══════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════

  // ── Idle / pre-dial ─────────────────────────────────
  if (screen === S.IDLE) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.idleContainer}>
          <View style={styles.idleIconCircle}>
            <Phone size={36} color="#FFF" />
          </View>
          <Text style={styles.idleTitle}>AuraHealth IVR</Text>
          <Text style={styles.idleSub}>
            {hi ? '\u0917\u094D\u0930\u093E\u092E\u0940\u0923 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u0947\u0935\u093E' : 'Rural Health Service'}
          </Text>
          {user?.name ? (
            <Text style={styles.idleUser}>{hi ? `\u0928\u092E\u0938\u094D\u0924\u0947, ${user.name}` : `Hello, ${user.name}`}</Text>
          ) : null}
          <View style={styles.ussdBadge}>
            <Text style={styles.ussdCode}>{USSD_CODE}</Text>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => handleKey('CALL')}
            activeOpacity={0.7}
          >
            <PhoneCall size={24} color="#FFF" />
            <Text style={styles.callBtnText}>{hi ? '\u0915\u0949\u0932 \u0915\u0930\u0947\u0902' : 'Dial Now'}</Text>
          </TouchableOpacity>
          <Text style={styles.idleHint}>
            {hi ? '\u0938\u092D\u0940 \u0938\u0947\u0935\u093E\u090F\u0902 \u0928\u0902\u092C\u0930 \u092A\u0948\u0921 \u0938\u0947 \u091A\u0932\u093E\u090F\u0902' : 'All services accessible via number pad'}
          </Text>

          {/* Feature highlights */}
          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Activity size={12} color="#C2185B" />
              <Text style={styles.featurePillText}>ML Risk</Text>
            </View>
            <View style={styles.featurePill}>
              <Heart size={12} color="#C2185B" />
              <Text style={styles.featurePillText}>{hi ? '\u0938\u094D\u0915\u094B\u0930' : 'Score'}</Text>
            </View>
            <View style={styles.featurePill}>
              <Sparkles size={12} color="#C2185B" />
              <Text style={styles.featurePillText}>AI</Text>
            </View>
            <View style={styles.featurePill}>
              <Shield size={12} color="#C2185B" />
              <Text style={styles.featurePillText}>SOS</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active call ─────────────────────────────────────
  const DIAL_KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerDot} />
        <Text style={styles.headerTitle}>
          {USSD_CODE} \u2014 {hi ? 'IVR \u0938\u0915\u094D\u0930\u093F\u092F' : 'IVR Active'}
        </Text>
        <TouchableOpacity
          onPress={() => { setTtsOn((v) => !v); if (ttsOn) Speech.stop(); }}
          style={styles.ttsToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {ttsOn ? <Volume2 size={18} color="#C2185B" /> : <VolumeX size={18} color="#999" />}
        </TouchableOpacity>
      </View>

      {/* ── Chat-style session log ────────────────── */}
      <ScrollView
        ref={logRef}
        style={styles.logArea}
        contentContainerStyle={styles.logContent}
        onContentSizeChange={scrollDown}
      >
        {sessionLog.map((entry, i) => {
          const isUser = entry.sender === 'YOU';
          const isSOS  = entry.sender === 'SOS';
          const isAI   = entry.sender === 'AI';
          const isREF  = entry.sender === 'REF';
          const isERR  = entry.sender === 'ERR';

          let bubbleStyle = styles.sysBubble;
          let tagStyle = styles.sysTagColor;
          if (isUser)      { bubbleStyle = styles.userBubble;  tagStyle = styles.userTagColor; }
          else if (isSOS)  { bubbleStyle = styles.sosBubble;   tagStyle = styles.sosTagColor; }
          else if (isAI)   { bubbleStyle = styles.aiBubble;    tagStyle = styles.aiTagColor; }
          else if (isREF)  { bubbleStyle = styles.refBubble;   tagStyle = styles.refTagColor; }
          else if (isERR)  { bubbleStyle = styles.errBubble;   tagStyle = styles.errTagColor; }

          return (
            <View key={i} style={[styles.msgBubble, bubbleStyle]}>
              <Text style={[styles.msgTag, tagStyle]}>{entry.sender}</Text>
              <Text style={[styles.msgText, isSOS && { color: '#C62828' }]}>{entry.text}</Text>
            </View>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <View style={[styles.msgBubble, styles.sysBubble, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <ActivityIndicator color="#C2185B" size="small" />
            <Text style={styles.msgText}>{hi ? '\u092A\u094D\u0930\u0915\u094D\u0930\u093F\u092F\u093E \u091C\u093E\u0930\u0940\u2026' : 'Processing\u2026'}</Text>
          </View>
        )}

        {/* Triage-result sub-menu */}
        {screen === S.TRIAGE_RESULT && triageResult && !loading && (
          <View style={[styles.msgBubble, styles.sysBubble]}>
            <Text style={[styles.msgTag, styles.sysTagColor]}>IVR</Text>
            <Text style={styles.msgText}>
              {hi
                ? '1: \u0930\u0947\u092B\u093C\u0930\u0932 \u0915\u093E\u0930\u094D\u0921 \u0926\u0947\u0916\u0947\u0902\n2: \u0938\u0932\u093E\u0939 \u0938\u0941\u0928\u0947\u0902\n0: \u0935\u093E\u092A\u0938'
                : '1: View referral card\n2: Listen to advice\n0: Back'}
            </Text>
          </View>
        )}

        {/* Tips sub-menu */}
        {screen === S.TIPS && !loading && (
          <View style={[styles.msgBubble, styles.sysBubble]}>
            <Text style={[styles.msgTag, styles.sysTagColor]}>IVR</Text>
            <Text style={styles.msgText}>
              {hi ? '1: \u0905\u0917\u0932\u093E  2: \u0926\u094B\u0939\u0930\u093E\u090F\u0902  0: \u0935\u093E\u092A\u0938' : '1: Next  2: Repeat  0: Back'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Dial pad ──────────────────────────────── */}
      <View style={styles.padContainer}>
        {DIAL_KEYS.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((k) => {
              const isHash = k === '#';
              const isStar = k === '*';
              return (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.padKey,
                    isHash && styles.padKeyHangup,
                    isStar && styles.padKeyStar,
                  ]}
                  onPress={() => handleKey(k)}
                  activeOpacity={0.6}
                >
                  {isHash ? (
                    <PhoneOff size={20} color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        styles.padKeyText,
                        isHash && { color: '#FFF' },
                        isStar && { color: '#FFF' },
                      ]}
                    >
                      {k}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════
// Styles — Pink/white theme matching AuraHealth UI
// ════════════════════════════════════════════════════════
const PAD_KEY_SIZE = Math.min((SCREEN_W - 80) / 3, 68);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF5F5' },

  /* ── Idle (pre-dial) ──────────────────────────── */
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  idleIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C2185B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  idleTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C2185B',
    marginTop: 16,
  },
  idleSub: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  idleUser: {
    fontSize: 13,
    color: '#E91E63',
    marginTop: 8,
    fontWeight: '600',
  },
  ussdBadge: {
    backgroundColor: '#FCE4EC',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 20,
  },
  ussdCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C2185B',
    letterSpacing: 3,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C2185B',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 28,
    elevation: 4,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  callBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  idleHint: {
    color: '#999',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE4E9',
  },
  featurePillText: {
    fontSize: 11,
    color: '#C2185B',
    fontWeight: '600',
  },

  /* ── Header ───────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  ttsToggle: { padding: 6 },

  /* ── Session log (chat bubbles) ───────────────── */
  logArea: { flex: 1 },
  logContent: { padding: 12, paddingBottom: 8 },

  msgBubble: {
    marginBottom: 10,
    borderRadius: 14,
    padding: 12,
    maxWidth: '92%',
  },
  sysBubble: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE4E9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  userBubble: {
    backgroundColor: '#FCE4EC',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#F8BBD0',
  },
  sosBubble: {
    backgroundColor: '#FFEBEE',
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#EF5350',
  },
  aiBubble: {
    backgroundColor: '#FFF8E1',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  errBubble: {
    backgroundColor: '#FFEBEE',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  refBubble: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },

  msgTag: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  sysTagColor: { color: '#C2185B' },
  userTagColor: { color: '#AD1457' },
  sosTagColor: { color: '#C62828' },
  aiTagColor: { color: '#F57C00' },
  errTagColor: { color: '#C62828' },
  refTagColor: { color: '#2E7D32' },

  /* ── Dial pad ─────────────────────────────────── */
  padContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFE4E9',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  padKey: {
    width: PAD_KEY_SIZE,
    height: PAD_KEY_SIZE,
    borderRadius: PAD_KEY_SIZE / 2,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#FFB6C1',
  },
  padKeyHangup: {
    backgroundColor: '#EF5350',
    borderColor: '#EF5350',
  },
  padKeyStar: {
    backgroundColor: '#C2185B',
    borderColor: '#C2185B',
  },
  padKeyText: {
    color: '#C2185B',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
