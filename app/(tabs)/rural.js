/**
 * IVR Rural Mode — Simulated USSD / missed-call IVR system
 *
 * Fully integrated with AuraHealth:
 *   - Every flow step collects explicit user input via the dial-pad
 *   - Triage uses riskEngine.js (same engine as main symptom screen)
 *   - Triage results are written to HealthDataLogger (shared app history)
 *   - SOS pulls real emergency contacts from storageService
 *   - SOS uses emergencyService.js to send real SMS alerts
 *   - Cycle prediction lets user input their last period date if missing
 *   - AI advice lets user choose topic before fetching
 *   - AI advice includes recent risk history for context
 *   - Facility list allows direct calling via dial-pad
 *
 * Flow:  Dial *141# → Welcome → Main Menu → sub-flows → 0: Back / #: End call
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLanguage }   from '../../src/context/LanguageContext';
import { useAuth }       from '../../src/context/AuthContext';
import { useCycleTracker } from '../../src/hooks/useCycleTracker';
import { getHealthAdvice } from '../../src/api/gemini';

// ── App-wide services (shared data layer) ─────────────────────────────────────
import { getUserProfile, getRiskHistory, logDailyHealth } from '../../src/services/HealthDataLogger';
import { calculateRisk }      from '../../src/services/riskEngine';
import { triggerEmergency }   from '../../src/services/emergencyService';
import { getEmergencyContacts } from '../../src/services/storageService';
import { savePeriodData, getPeriodData } from '../../src/utils/storage';
import { scopedKey }          from '../../src/services/authService';

const { width: SCREEN_W } = Dimensions.get('window');
const USSD_CODE = '*141#';

// ──────────────────────────────────────────────────────────────────────────────
// Facility directory (realistic Indian PHC/CHC data)
// ──────────────────────────────────────────────────────────────────────────────
const FACILITY_DIRECTORY = [
  { name: 'IVR Worker Sushila',    type: 'IVR Worker',        dist: 0,  phone: '9876543210' },
  { name: 'Sub-Centre Majhgawan',  type: 'Sub-Centre',        dist: 2,  phone: '05192-274301' },
  { name: 'PHC Rampur',            type: 'PHC',               dist: 5,  phone: '05192-274512' },
  { name: 'CHC Barabanki',         type: 'CHC',               dist: 12, phone: '05248-222017' },
  { name: 'District Hospital Gonda', type: 'District Hospital', dist: 22, phone: '05262-231401' },
];

// ──────────────────────────────────────────────────────────────────────────────
// IVR state-machine screens
// ──────────────────────────────────────────────────────────────────────────────
const S = {
  IDLE:           'IDLE',
  CONNECTING:     'CONNECTING',
  MAIN_MENU:      'MAIN_MENU',
  // Option 1 — Cycle
  CYCLE:          'CYCLE',
  CYCLE_INPUT:    'CYCLE_INPUT',     // collect last period date if missing
  // Option 2 — AI Advice
  ADVICE_TOPIC:   'ADVICE_TOPIC',   // user chooses topic before fetching
  ADVICE_LOADING: 'ADVICE_LOADING',
  ADVICE_RESULT:  'ADVICE_RESULT',
  // Option 3 — Health Tips
  TIPS:           'TIPS',
  // Option 4 — Triage
  TRIAGE_MOOD:    'TRIAGE_MOOD',    // ask wellbeing/mood first
  TRIAGE_SELECT:  'TRIAGE_SELECT',  // symptom selection
  TRIAGE_LOADING: 'TRIAGE_LOADING',
  TRIAGE_RESULT:  'TRIAGE_RESULT',
  REFERRAL_CARD:  'REFERRAL_CARD',
  // Option 5 — History
  HISTORY:        'HISTORY',
  // Option 6 — Facilities
  FACILITIES:     'FACILITIES',
  // Option 9 — SOS
  SOS:            'SOS',
  SOS_SENDING:    'SOS_SENDING',    // while sending emergency SMS
};

// ── Triage symptoms — IDs match riskEngine.js SYMPTOM_WEIGHTS ─────────────────
const TRIAGE_SYMPTOMS = [
  { id: 'heavyBleeding',   key: '1', en: 'Heavy bleeding',      hi: 'अत्यधिक रक्तस्राव'  },
  { id: 'fatigue',         key: '2', en: 'Fatigue / tiredness',  hi: 'थकान'                },
  { id: 'dizziness',       key: '3', en: 'Dizziness / fainting', hi: 'चक्कर आना'           },
  { id: 'pain',            key: '4', en: 'Severe pain',          hi: 'तेज़ दर्द'            },
  { id: 'vomiting',        key: '5', en: 'Vomiting / nausea',    hi: 'उल्टी / मतली'        },
  { id: 'fever',           key: '6', en: 'Fever > 3 days',       hi: '3 दिन से बुखार'      },
  { id: 'irregularCycles', key: '7', en: 'Irregular periods',    hi: 'अनियमित माहवारी'     },
  { id: 'lowHb',           key: '8', en: 'Pale skin / low Hb',   hi: 'पीली त्वचा / खून कम' },
  { id: 'pregnancyIssue',  key: '9', en: 'Pregnancy concern',    hi: 'गर्भावस्था चिंता'    },
];

// ── Health tips (rotated via TTS) ─────────────────────────────────────────────
const HEALTH_TIPS = [
  { en: 'Drink at least 8 glasses of water daily to stay hydrated and reduce fatigue.',
    hi: 'हर दिन कम से कम 8 गिलास पानी पिएं। इससे थकान कम होती है।' },
  { en: 'Eat green leafy vegetables and jaggery to maintain iron levels and prevent anaemia.',
    hi: 'हरी पत्तेदार सब्ज़ियां और गुड़ खाएं। इससे खून की कमी नहीं होती।' },
  { en: 'Walk for 30 minutes daily. It helps reduce period pain and improves mood.',
    hi: 'रोज़ 30 मिनट पैदल चलें। इससे माहवारी का दर्द कम होता है।' },
  { en: 'Use a clean cloth or sanitary pad. Change every 4–6 hours.',
    hi: 'माहवारी में साफ कपड़ा या पैड इस्तेमाल करें। हर 4-6 घंटे बदलें।' },
  { en: 'If very dizzy, lie down and drink ORS or salted water immediately.',
    hi: 'अगर बहुत चक्कर आए तो लेट जाएं और तुरंत ORS या नमक-पानी पिएं।' },
  { en: 'Take an iron tablet daily if advised by your doctor.',
    hi: 'डॉक्टर ने कहा हो तो रोज़ एक आयरन की गोली लें।' },
  { en: 'Wash hands with soap before eating and after using the toilet.',
    hi: 'खाना खाने से पहले और शौचालय के बाद साबुन से हाथ धोएं।' },
  { en: 'Sleep at least 7–8 hours every night for better health and immunity.',
    hi: 'हर रात 7-8 घंटे सोएं। इससे सेहत और इम्यूनिटी अच्छी रहती है।' },
];

// ── Days-ago mapping for CYCLE_INPUT ─────────────────────────────────────────
const CYCLE_DAYS_MAP = {
  '1': 2,   // 1-2 days ago
  '2': 5,   // 3-5 days ago
  '3': 8,   // 6-10 days ago
  '4': 14,  // 11-14 days ago
  '5': 18,  // 15-21 days ago
  '6': 25,  // 22-28 days ago
  '7': 33,  // 29+ days ago
};

// ── Advice topics for ADVICE_TOPIC selection ──────────────────────────────────
const ADVICE_TOPICS = {
  '1': { en: 'menstrual cycle and period health',            hi: 'माहवारी और पीरियड स्वास्थ्य'   },
  '2': { en: 'nutrition, iron deficiency and anaemia',       hi: 'पोषण, आयरन की कमी और एनीमिया' },
  '3': { en: 'pain management for cramps and body pain',     hi: 'ऐंठन और शरीर दर्द का उपचार'   },
  '4': { en: 'general wellness, hydration and mental health', hi: 'सामान्य स्वास्थ्य और मानसिक स्वास्थ्य' },
};

// ══════════════════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════════════════
export default function RuralIVRScreen() {
  const { language } = useLanguage();
  const { user }     = useAuth();
  const cycle        = useCycleTracker();
  const logRef       = useRef(null);
  const hi           = language === 'hi';

  /* ── core state ──────────────────────────────────── */
  const [screen, setScreen]     = useState(S.IDLE);
  const [ttsOn, setTtsOn]       = useState(true);
  const [loading, setLoading]   = useState(false);
  const [sessionLog, setSessionLog] = useState([]);

  /* ── sub-screen data ─────────────────────────────── */
  const [adviceText, setAdviceText]       = useState('');
  const [adviceTopic, setAdviceTopic]     = useState(null);
  const [tipIndex, setTipIndex]           = useState(0);
  const [triageMood, setTriageMood]       = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [triageResult, setTriageResult]   = useState(null);
  const [referralHistory, setReferralHistory] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState(null);

  // ── helpers ───────────────────────────────────────

  const speak = useCallback((text) => {
    if (!ttsOn) return;
    Speech.stop();
    Speech.speak(text, { language: hi ? 'hi-IN' : 'en-IN', rate: 0.85, pitch: 1.0 });
  }, [ttsOn, hi]);

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

  // ── persistence ──────────────────────────────────

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

  // Load real emergency contacts once on mount
  useEffect(() => {
    getEmergencyContacts()
      .then((c) => setEmergencyContacts(c))
      .catch(() => {});
  }, []);

  // ════════════════════════════════════════════════
  // Screen-entry effects
  // ════════════════════════════════════════════════

  // CONNECTING
  useEffect(() => {
    if (screen !== S.CONNECTING) return;
    Vibration.vibrate([0, 200, 150, 200]);
    const msg = hi
      ? `AuraHealth IVR में स्वागत है, ${user?.name || ''}। कृपया प्रतीक्षा करें…`
      : `Welcome to AuraHealth IVR, ${user?.name || ''}. Please wait…`;
    log('SYS', msg);
    speak(msg);
    const t = setTimeout(() => go(S.MAIN_MENU), 2200);
    return () => clearTimeout(t);
  }, [screen]);

  // MAIN_MENU
  useEffect(() => {
    if (screen !== S.MAIN_MENU) return;
    const menu = hi
      ? '1: माहवारी पूर्वानुमान\n2: AI स्वास्थ्य सलाह\n3: स्वास्थ्य टिप्स\n4: लक्षण जांच + रेफ़रल\n5: रेफ़रल इतिहास\n6: नज़दीकी सुविधाएं\n9: आपातकालीन SOS\n0: वापस  #: कॉल समाप्त'
      : '1: Cycle prediction\n2: AI health advice\n3: Health tips\n4: Symptom triage + referral\n5: Referral history\n6: Nearby facilities\n9: Emergency SOS\n0: Back  #: End call';
    log('IVR', menu);
    speak(hi
      ? '1 माहवारी, 2 AI सलाह, 3 टिप्स, 4 लक्षण जांच, 5 इतिहास, 6 सुविधाएं, 9 आपातकालीन, हैश कॉल समाप्त'
      : 'Press 1 cycle, 2 AI advice, 3 tips, 4 triage, 5 history, 6 facilities, 9 emergency, hash to end');
  }, [screen]);

  // CYCLE — show data; redirect to input if none
  useEffect(() => {
    if (screen !== S.CYCLE) return;
    if (!cycle.nextPeriodDate) { go(S.CYCLE_INPUT); return; }
    const date = cycle.nextPeriodDate;
    const days = cycle.daysUntilNextPeriod != null
      ? `${cycle.daysUntilNextPeriod} ${hi ? 'दिन शेष' : 'days left'}`
      : hi ? 'डेटा अपर्याप्त' : 'Not enough data';
    const len  = `${cycle.cycleLength} ${hi ? 'दिन का चक्र' : 'day cycle'}`;
    const msg  = hi
      ? `📅 अगली माहवारी: ${date}\n⏳ ${days}\n🔄 औसत: ${len}\n\n0: वापस`
      : `📅 Next period: ${date}\n⏳ ${days}\n🔄 Average: ${len}\n\n0: Back`;
    log('IVR', msg);
    speak(hi ? `अगली माहवारी ${date}, ${days}` : `Next period ${date}, ${days}`);
  }, [screen]);

  // CYCLE_INPUT — collect last period start date from user
  useEffect(() => {
    if (screen !== S.CYCLE_INPUT) return;
    const msg = hi
      ? `📅 पिछली माहवारी कब शुरू हुई?\n\n1: 1-2 दिन पहले\n2: 3-5 दिन पहले\n3: 6-10 दिन पहले\n4: 11-14 दिन पहले\n5: 15-21 दिन पहले\n6: 22-28 दिन पहले\n7: 29+ दिन पहले\n\n0: वापस`
      : `📅 When did your last period start?\n\n1: 1-2 days ago\n2: 3-5 days ago\n3: 6-10 days ago\n4: 11-14 days ago\n5: 15-21 days ago\n6: 22-28 days ago\n7: 29+ days ago\n\n0: Back`;
    log('IVR', msg);
    speak(hi ? 'पिछली माहवारी कब शुरू हुई? नंबर दबाएं।' : 'When did your last period start? Press a number.');
  }, [screen]);

  // ADVICE_TOPIC — user picks topic before AI fetch
  useEffect(() => {
    if (screen !== S.ADVICE_TOPIC) return;
    const msg = hi
      ? `💬 किस विषय पर सलाह चाहिए?\n\n1: माहवारी और पीरियड\n2: पोषण और खून की कमी\n3: दर्द में राहत\n4: सामान्य स्वास्थ्य\n\n0: वापस`
      : `💬 What would you like advice on?\n\n1: Period & cycle health\n2: Nutrition & anaemia\n3: Pain management\n4: General wellness\n\n0: Back`;
    log('IVR', msg);
    speak(hi ? 'किस विषय पर सलाह चाहिए? नंबर दबाएं।' : 'Choose a topic. Press a number.');
  }, [screen]);

  // ADVICE_LOADING — fetch with topic + risk history
  const fetchAdvice = useCallback(async () => {
    setLoading(true);
    setAdviceText('');
    log('IVR', hi ? '⏳ Gemini AI से सलाह ले रहे हैं…' : '⏳ Fetching advice from Gemini AI…');
    try {
      const [profile, history] = await Promise.all([getUserProfile(), getRiskHistory()]);
      const recentRisk = history?.slice(-3)
        .map((r) => r.risk_level || r.level).filter(Boolean).join(', ') || 'none';
      const topic = ADVICE_TOPICS[adviceTopic] || ADVICE_TOPICS['4'];
      const prompt = hi
        ? `मैं ${profile?.age || 'अज्ञात'} वर्ष की ग्रामीण महिला हूँ। चक्र: ${cycle.cycleLength} दिन। हाल का जोखिम: ${recentRisk}। विषय: ${topic.hi}। सरल हिंदी में 5 व्यावहारिक सुझाव दें।`
        : `I am a ${profile?.age || 'unknown'} year old rural woman. Cycle: ${cycle.cycleLength} days. Recent risk: ${recentRisk}. Topic: ${topic.en}. Give 5 practical tips in simple English.`;
      const result = await getHealthAdvice(prompt, language);
      setAdviceText(result);
      log('AI', result);
      speak(result);
    } catch (e) {
      const err = hi ? 'सलाह लोड नहीं हो सकी। बाद में प्रयास करें।' : 'Could not load advice. Try later.';
      setAdviceText(err);
      log('ERR', err);
      speak(err);
    }
    setLoading(false);
    go(S.ADVICE_RESULT);
  }, [hi, language, adviceTopic, cycle.cycleLength]);

  useEffect(() => {
    if (screen === S.ADVICE_LOADING) fetchAdvice();
  }, [screen]);

  // TIPS — rotating TTS
  const speakCurrentTip = useCallback((idx) => {
    const tip  = HEALTH_TIPS[idx];
    const text = hi ? tip.hi : tip.en;
    log('IVR', `💡 (${idx + 1}/${HEALTH_TIPS.length}) ${text}`);
    speak(text);
  }, [hi, speak, log]);

  useEffect(() => {
    if (screen === S.TIPS) speakCurrentTip(tipIndex);
  }, [screen]);

  // TRIAGE_MOOD — ask how user feels before symptom selection
  useEffect(() => {
    if (screen !== S.TRIAGE_MOOD) return;
    const msg = hi
      ? '🩺 आज आप कैसा महसूस कर रही हैं?\n\n1: अच्छा\n2: ठीक-ठाक\n3: खराब\n4: बहुत खराब\n\n0: वापस'
      : '🩺 How are you feeling today?\n\n1: Good\n2: Okay\n3: Poor\n4: Very poor\n\n0: Back';
    log('IVR', msg);
    speak(hi ? 'आज आप कैसा महसूस कर रही हैं? नंबर दबाएं।' : 'How are you feeling today? Press a number.');
  }, [screen]);

  // TRIAGE_SELECT — symptom selection
  useEffect(() => {
    if (screen !== S.TRIAGE_SELECT) return;
    const lines = TRIAGE_SYMPTOMS.map((s) => `${s.key}: ${hi ? s.hi : s.en}`).join('\n');
    log('IVR', hi
      ? `🩺 लक्षण चुनें (एक से अधिक चुन सकते हैं):\n${lines}\n\n*: जांच चलाएं  0: वापस`
      : `🩺 Select symptoms (choose multiple):\n${lines}\n\n*: Run triage  0: Back`);
    speak(hi
      ? 'लक्षणों के नंबर दबाएं। सभी चुनने के बाद स्टार दबाएं।'
      : 'Press symptom numbers. Press star when done to run triage.');
  }, [screen]);

  const toggleSymptom = (id) =>
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  // TRIAGE — uses riskEngine.js + saves to HealthDataLogger
  const runTriage = useCallback(async () => {
    if (selectedSymptoms.length === 0) {
      log('IVR', hi ? '⚠️ कम से कम एक लक्षण चुनें।' : '⚠️ Select at least one symptom.');
      return;
    }
    setLoading(true);
    go(S.TRIAGE_LOADING);
    log('IVR', hi ? '⏳ AI जांच चल रही है…' : '⏳ Running AI triage…');

    try {
      // Build symptom object matching riskEngine.js SYMPTOM_WEIGHTS keys
      const symptomsObj = {};
      TRIAGE_SYMPTOMS.forEach((s) => { symptomsObj[s.id] = selectedSymptoms.includes(s.id); });

      // Shared risk engine (same as main symptom screen)
      const riskResult = calculateRisk(symptomsObj, {}, language);
      const { level, score, advice } = riskResult;

      const symptomNames = selectedSymptoms
        .map((id) => { const s = TRIAGE_SYMPTOMS.find((t) => t.id === id); return s ? (hi ? s.hi : s.en) : id; })
        .join(', ');

      // AI advice for this specific triage session
      let aiAdvice = advice;
      try {
        const prompt = hi
          ? `ग्रामीण मरीज़ के लक्षण: ${symptomNames}। जोखिम: ${level}। सरल हिंदी में 4 पंक्तियों में सलाह + OTC दवाएं बताएं।`
          : `Rural patient symptoms: ${symptomNames}. Risk: ${level}. Give 4-line advice + safe OTC medications available in India.`;
        aiAdvice = await getHealthAdvice(prompt, language);
      } catch (_) { /* keep riskEngine fallback */ }

      const facilityType =
        level === 'HIGH'     ? 'District Hospital' :
        level === 'MODERATE' ? 'PHC'               : 'IVR Worker';
      const facility = FACILITY_DIRECTORY.find((f) => f.type === facilityType) || FACILITY_DIRECTORY[0];

      const result = {
        level, score, message: advice, aiAdvice, symptoms: symptomNames,
        facility, timestamp: new Date().toISOString(),
        userName: user?.name || 'User', mood: triageMood, source: 'IVR',
      };

      // Write to shared HealthDataLogger → shows in app risk history
      await logDailyHealth({
        symptoms: selectedSymptoms,
        mood: triageMood === '1' ? 'happy' : triageMood === '4' ? 'sad' : 'neutral',
        notes: `IVR triage: ${symptomNames}`,
      }).catch(() => {});

      setTriageResult(result);
      await saveReferral(result);

      log('IVR', advice);
      log('AI',  aiAdvice);
      log('IVR', `📍 ${hi ? 'रेफ़र' : 'Refer to'}: ${facility.name} (${facility.dist} km) — ☎ ${facility.phone}`);
      speak(advice);

      // Auto-trigger emergency SMS on HIGH risk
      if (level === 'HIGH') {
        log('SOS', hi ? '🚨 उच्च जोखिम — आपातकालीन SMS भेजा जा रहा है…' : '🚨 HIGH risk — sending emergency SMS…');
        triggerEmergency(score, language).catch(() => {});
      }
    } catch (e) {
      log('ERR', hi ? 'जांच विफल। पुनः प्रयास करें।' : 'Triage failed. Please try again.');
    }
    setLoading(false);
    go(S.TRIAGE_RESULT);
  }, [selectedSymptoms, triageMood, hi, language, go, log, speak, user]);

  // FACILITIES — list with direct-call
  useEffect(() => {
    if (screen !== S.FACILITIES) return;
    const lines = FACILITY_DIRECTORY.map(
      (f, i) => `${i + 1}. ${f.name}\n   ${f.type} — ${f.dist} km — ☎ ${f.phone}`
    ).join('\n');
    log('IVR', hi
      ? `🏥 नज़दीकी सुविधाएं:\n\n${lines}\n\n[नंबर दबाकर सीधे कॉल करें]\n0: वापस`
      : `🏥 Nearby facilities:\n\n${lines}\n\n[Press number to call directly]\n0: Back`);
    speak(hi
      ? 'सुविधाओं की सूची। किसी को सीधे कॉल करने के लिए नंबर दबाएं।'
      : 'Facilities list. Press a number to call directly.');
  }, [screen]);

  // HISTORY
  useEffect(() => {
    if (screen === S.HISTORY) loadReferralHistory();
  }, [screen]);

  useEffect(() => {
    if (screen !== S.HISTORY) return;
    if (referralHistory.length > 0) {
      const items = referralHistory.slice(-5).reverse().map((r, i) => {
        const d = new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN');
        return `${i + 1}. ${d} | ${r.level} | ${r.facility?.name || '—'}`;
      }).join('\n');
      log('IVR', hi ? `📜 पिछले रेफ़रल:\n${items}\n\n0: वापस` : `📜 Past referrals:\n${items}\n\n0: Back`);
    } else {
      log('IVR', hi ? '📜 कोई रिकॉर्ड नहीं।\n\n0: वापस' : '📜 No records yet.\n\n0: Back');
    }
  }, [screen, referralHistory]);

  // SOS — pull real contacts from storageService
  useEffect(() => {
    if (screen !== S.SOS) return;
    Vibration.vibrate([0, 400, 200, 400, 200, 400]);
    const ashaNum   = emergencyContacts?.ashaNumber  || '9876543210';
    const familyNum = emergencyContacts?.familyNumber;
    const lines = [
      `1: ${hi ? 'IVR कार्यकर्ता को कॉल करें' : 'Call IVR worker'} (${ashaNum})`,
      familyNum ? `2: ${hi ? 'परिवार को कॉल करें' : 'Call family'} (${familyNum})` : null,
      `3: 108 ${hi ? 'एम्बुलेंस' : 'Ambulance'}`,
      `4: 112 ${hi ? 'हेल्पलाइन' : 'Helpline'}`,
      `5: ${hi ? 'आपातकालीन SMS भेजें' : 'Send emergency SMS'}`,
      `\n0: ${hi ? 'वापस' : 'Back'}`,
    ].filter(Boolean).join('\n');
    log('SOS', `🚨 ${hi ? 'आपातकालीन!' : 'EMERGENCY!'}\n\n${lines}`);
    speak(hi ? 'आपातकालीन मोड। विकल्प चुनें।' : 'Emergency mode. Choose an option.');
  }, [screen, emergencyContacts]);

  // SOS_SENDING — real SMS via emergencyService
  useEffect(() => {
    if (screen !== S.SOS_SENDING) return;
    log('SOS', hi ? '⏳ आपातकालीन SMS भेजा जा रहा है…' : '⏳ Sending emergency SMS…');
    triggerEmergency(9, language)
      .then(({ smsResult }) => {
        log('SOS', smsResult?.message || (hi ? '✅ SMS भेजा गया।' : '✅ Emergency SMS sent.'));
        go(S.SOS);
      })
      .catch(() => {
        log('ERR', hi ? 'SMS भेजने में विफल।' : 'Failed to send SMS.');
        go(S.SOS);
      });
  }, [screen]);

  // REFERRAL_CARD
  useEffect(() => {
    if (screen !== S.REFERRAL_CARD || !triageResult) return;
    const r = triageResult;
    const card = [
      '┌───── REFERRAL CARD ─────┐',
      `│ ${hi ? 'नाम'    : 'Name'    }: ${r.userName}`,
      `│ ${hi ? 'दिनांक' : 'Date'    }: ${new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}`,
      `│ ${hi ? 'जोखिम'  : 'Risk'    }: ${r.level}`,
      `│ ${hi ? 'लक्षण'  : 'Symptoms'}: ${r.symptoms}`,
      '│─────────────────────────│',
      `│ ${hi ? 'रेफ़र'  : 'Refer to'}: ${r.facility.name}`,
      `│ ${r.facility.type} — ${r.facility.dist} km`,
      `│ ☎ ${r.facility.phone}`,
      '└─────────────────────────┘',
      '',
      hi ? '0: वापस' : '0: Back',
    ].join('\n');
    log('REF', card);
    speak(hi ? `रेफ़रल कार्ड: ${r.facility.name} को रेफ़र किया गया।` : `Referral card: referred to ${r.facility.name}.`);
  }, [screen]);

  // ════════════════════════════════════════════════
  // Dial-pad key handler — IVR state dispatcher
  // ════════════════════════════════════════════════
  const handleKey = useCallback((key) => {
    Vibration.vibrate(30);
    log('YOU', key);

    // # = hang up / reset
    if (key === '#') {
      Speech.stop();
      setScreen(S.IDLE);
      setSessionLog([]);
      setSelectedSymptoms([]);
      setTriageResult(null);
      setTriageMood(null);
      setAdviceTopic(null);
      return;
    }

    switch (screen) {

      case S.IDLE:
        if (key === '*' || key === 'CALL') go(S.CONNECTING);
        break;

      case S.MAIN_MENU:
        if      (key === '1') go(S.CYCLE);
        else if (key === '2') go(S.ADVICE_TOPIC);
        else if (key === '3') { setTipIndex(0); go(S.TIPS); }
        else if (key === '4') { setSelectedSymptoms([]); setTriageMood(null); go(S.TRIAGE_MOOD); }
        else if (key === '5') go(S.HISTORY);
        else if (key === '6') go(S.FACILITIES);
        else if (key === '9') go(S.SOS);
        break;

      case S.CYCLE:
        if (key === '0') go(S.MAIN_MENU);
        break;

      case S.CYCLE_INPUT: {
        if (key === '0') { go(S.MAIN_MENU); break; }
        const daysAgo = CYCLE_DAYS_MAP[key];
        if (daysAgo) {
          const lastPeriod = new Date();
          lastPeriod.setDate(lastPeriod.getDate() - daysAgo);
          const isoDate = lastPeriod.toISOString().split('T')[0];
          getPeriodData()
            .then((existing) => {
              const dates = existing || [];
              if (!dates.includes(isoDate)) dates.push(isoDate);
              return savePeriodData(dates);
            })
            .catch(() => {})
            .finally(() => {
              log('IVR', hi ? `✅ माहवारी दर्ज हुई: ${isoDate}` : `✅ Period recorded: ${isoDate}`);
              speak(hi ? 'माहवारी की तारीख सेव हुई।' : 'Period date saved.');
              go(S.CYCLE);
            });
        }
        break;
      }

      case S.ADVICE_TOPIC:
        if (key === '0') { go(S.MAIN_MENU); break; }
        if (ADVICE_TOPICS[key]) {
          setAdviceTopic(key);
          const label = hi ? ADVICE_TOPICS[key].hi : ADVICE_TOPICS[key].en;
          log('IVR', `${hi ? 'विषय' : 'Topic'}: ${label}`);
          go(S.ADVICE_LOADING);
        }
        break;

      case S.ADVICE_RESULT:
        if (key === '0') go(S.MAIN_MENU);
        else if (key === '2' && adviceText) speak(adviceText);
        break;

      case S.TIPS:
        if (key === '0') go(S.MAIN_MENU);
        else if (key === '1') {
          const next = (tipIndex + 1) % HEALTH_TIPS.length;
          setTipIndex(next);
          speakCurrentTip(next);
        }
        else if (key === '2') speakCurrentTip(tipIndex);
        break;

      case S.TRIAGE_MOOD:
        if (key === '0') { go(S.MAIN_MENU); break; }
        if (['1', '2', '3', '4'].includes(key)) {
          setTriageMood(key);
          const labels = hi
            ? { '1': 'अच्छा', '2': 'ठीक-ठाक', '3': 'खराब', '4': 'बहुत खराब' }
            : { '1': 'Good',  '2': 'Okay',    '3': 'Poor',  '4': 'Very poor'  };
          log('IVR', `${hi ? 'मूड' : 'Mood'}: ${labels[key]}`);
          go(S.TRIAGE_SELECT);
        }
        break;

      case S.TRIAGE_SELECT:
        if (key === '0') go(S.MAIN_MENU);
        else if (key === '*') runTriage();
        else {
          const sym = TRIAGE_SYMPTOMS.find((s) => s.key === key);
          if (sym) {
            const wasSelected = selectedSymptoms.includes(sym.id);
            toggleSymptom(sym.id);
            log('IVR', wasSelected ? `➖ ${hi ? sym.hi : sym.en}` : `➕ ${hi ? sym.hi : sym.en}`);
          }
        }
        break;

      case S.TRIAGE_RESULT:
        if (key === '0') go(S.MAIN_MENU);
        else if (key === '1' && triageResult) go(S.REFERRAL_CARD);
        else if (key === '2' && triageResult) speak(triageResult.aiAdvice);
        break;

      case S.REFERRAL_CARD:
        if (key === '0') go(S.MAIN_MENU);
        break;

      case S.HISTORY:
        if (key === '0') go(S.MAIN_MENU);
        break;

      case S.FACILITIES: {
        if (key === '0') { go(S.MAIN_MENU); break; }
        const f = FACILITY_DIRECTORY[parseInt(key, 10) - 1];
        if (f) dialPhone(f.phone);
        break;
      }

      case S.SOS: {
        if (key === '0') { go(S.MAIN_MENU); break; }
        const ashaNum   = emergencyContacts?.ashaNumber  || '9876543210';
        const familyNum = emergencyContacts?.familyNumber;
        if      (key === '1') dialPhone(ashaNum);
        else if (key === '2' && familyNum)  dialPhone(familyNum);
        else if (key === '2' && !familyNum) dialPhone('108');
        else if (key === '3') dialPhone('108');
        else if (key === '4') dialPhone('112');
        else if (key === '5') go(S.SOS_SENDING);
        break;
      }

      default: break;
    }

    scrollDown();
  }, [
    screen, selectedSymptoms, tipIndex, triageResult, triageMood,
    adviceText, hi, go, speak, log, emergencyContacts,
    speakCurrentTip, runTriage,
  ]);

  const dialPhone = (number) => {
    const url = Platform.OS === 'ios' ? `telprompt:${number}` : `tel:${number}`;
    Linking.openURL(url).catch(() => {});
  };

  // ══════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════

  if (screen === S.IDLE) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.idleContainer}>
          <Phone size={56} color="#0f0" />
          <Text style={styles.idleTitle}>AuraHealth IVR</Text>
          <Text style={styles.idleSub}>
            {hi ? 'ग्रामीण स्वास्थ्य सेवा' : 'Rural Health Service'}
          </Text>
          <Text style={styles.ussdCode}>{USSD_CODE}</Text>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => handleKey('CALL')}
            activeOpacity={0.7}
          >
            <PhoneCall size={28} color="#fff" />
            <Text style={styles.callBtnText}>{hi ? 'कॉल करें' : 'Dial Now'}</Text>
          </TouchableOpacity>
          <Text style={styles.idleHint}>
            {hi ? 'ऊपर बटन दबाकर IVR शुरू करें' : 'Press the button above to start the IVR'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const DIAL_KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <Phone size={18} color="#0f0" />
        <Text style={styles.headerTitle}>
          {USSD_CODE} — {hi ? 'IVR सक्रिय' : 'IVR Active'}
        </Text>
        <TouchableOpacity
          onPress={() => { setTtsOn((v) => !v); if (ttsOn) Speech.stop(); }}
          style={styles.ttsToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {ttsOn ? <Volume2 size={18} color="#0f0" /> : <VolumeX size={18} color="#555" />}
        </TouchableOpacity>
      </View>

      {/* ── USSD session log ─────────────────────── */}
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
          let tagColor = '#0f0';
          if (isUser) tagColor = '#0af';
          else if (isSOS)  tagColor = '#f44';
          else if (isAI)   tagColor = '#ff0';
          else if (isREF)  tagColor = '#f90';
          else if (isERR)  tagColor = '#f44';
          return (
            <View key={i} style={styles.logEntry}>
              <Text style={[styles.logTag, { color: tagColor }]}>{entry.sender}</Text>
              <Text style={[
                styles.logText,
                isSOS && { color: '#f44' },
                isREF && { color: '#f90' },
              ]}>
                {entry.text}
              </Text>
            </View>
          );
        })}

        {loading && (
          <View style={styles.logEntry}>
            <Text style={[styles.logTag, { color: '#ff0' }]}>SYS</Text>
            <ActivityIndicator color="#0f0" size="small" />
          </View>
        )}

        {screen === S.TRIAGE_RESULT && triageResult && !loading && (
          <View style={styles.logEntry}>
            <Text style={[styles.logTag, { color: '#0f0' }]}>IVR</Text>
            <Text style={styles.logText}>
              {hi ? '1: रेफ़रल कार्ड\n2: सलाह सुनें\n0: वापस'
                  : '1: Referral card\n2: Listen to advice\n0: Back'}
            </Text>
          </View>
        )}
        {screen === S.TIPS && !loading && (
          <View style={styles.logEntry}>
            <Text style={[styles.logTag, { color: '#0f0' }]}>IVR</Text>
            <Text style={styles.logText}>
              {hi ? '1: अगला  2: दोहराएं  0: वापस' : '1: Next  2: Repeat  0: Back'}
            </Text>
          </View>
        )}
        {screen === S.ADVICE_RESULT && adviceText && !loading && (
          <View style={styles.logEntry}>
            <Text style={[styles.logTag, { color: '#0f0' }]}>IVR</Text>
            <Text style={styles.logText}>
              {hi ? '2: दोहराएं  0: वापस' : '2: Repeat  0: Back'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Dial pad ─────────────────────────────── */}
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
                    <PhoneOff size={20} color="#fff" />
                  ) : (
                    <Text style={[
                      styles.padKeyText,
                      isHash && { color: '#fff' },
                      isStar && { color: '#000' },
                    ]}>
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
// Styles — black/green terminal + phone dial-pad
// ════════════════════════════════════════════════════════
const PAD_KEY_SIZE = Math.min((SCREEN_W - 80) / 3, 72);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0a' },

  /* ── Idle (pre-dial) ──────────────────────────── */
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  idleTitle: {
    color: '#0f0',
    fontSize: 30,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 16,
  },
  idleSub: {
    color: '#0a0',
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  ussdCode: {
    color: '#ff0',
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 28,
    letterSpacing: 4,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 40,
    marginTop: 32,
    elevation: 6,
    shadowColor: '#0f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  callBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginLeft: 12,
  },
  idleHint: {
    color: '#555',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 20,
    textAlign: 'center',
  },

  /* ── Header ───────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#0f02',
  },
  headerTitle: {
    flex: 1,
    color: '#0f0',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  ttsToggle: { padding: 6 },

  /* ── Session log ──────────────────────────────── */
  logArea: { flex: 1 },
  logContent: { padding: 12, paddingBottom: 8 },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  logTag: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    width: 36,
    marginRight: 8,
    marginTop: 2,
  },
  logText: {
    flex: 1,
    color: '#0d0',
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 21,
  },

  /* ── Dial pad ─────────────────────────────────── */
  padContainer: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#0f02',
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
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#0f03',
  },
  padKeyHangup: {
    backgroundColor: '#c00',
    borderColor: '#f005',
  },
  padKeyStar: {
    backgroundColor: '#0c0',
    borderColor: '#0f05',
  },
  padKeyText: {
    color: '#0f0',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
