/**
 * IVR Rural Mode — Simulated USSD / missed-call IVR system
 *
 * A phone-style interface with a numeric dial-pad, USSD session log,
 * TTS auto-read, Gemini AI health advice, cycle prediction,
 * symptom triage with severity scoring, referral card generation,
 * facility directory, and emergency SOS — all designed for
 * low-literacy rural users.
 *
 * Flow:  Dial *141# → Welcome → Main Menu → sub-flows → Back (0) / Hang up (#)
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
  MapPin,
  AlertTriangle,
  Hash,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useCycleTracker } from '../../src/hooks/useCycleTracker';
import { getHealthAdvice } from '../../src/api/gemini';
import { getUserProfile, getRiskHistory } from '../../src/services/HealthDataLogger';
import { scopedKey } from '../../src/services/authService';

const { width: SCREEN_W } = Dimensions.get('window');

// ────────────────────────────────────────────────────────
// Facility directory (realistic Indian PHC/CHC data)
// ────────────────────────────────────────────────────────
const FACILITY_DIRECTORY = [
  { name: 'ASHA Sushila Devi',     type: 'ASHA Worker',       dist: 0,  phone: '9876543210' },
  { name: 'Sub-Centre Majhgawan',  type: 'Sub-Centre',        dist: 2,  phone: '05192-274301' },
  { name: 'PHC Rampur',            type: 'PHC',               dist: 5,  phone: '05192-274512' },
  { name: 'CHC Barabanki',         type: 'CHC',               dist: 12, phone: '05248-222017' },
  { name: 'District Hospital Gonda', type: 'District Hospital', dist: 22, phone: '05262-231401' },
];

// ────────────────────────────────────────────────────────
// IVR state-machine screens
// ────────────────────────────────────────────────────────
const S = {
  IDLE:           'IDLE',           // Before dialling
  CONNECTING:     'CONNECTING',     // Simulated ring
  MAIN_MENU:      'MAIN_MENU',
  CYCLE:          'CYCLE',
  ADVICE_LOADING: 'ADVICE_LOADING',
  ADVICE_RESULT:  'ADVICE_RESULT',
  TIPS:           'TIPS',
  TRIAGE_SELECT:  'TRIAGE_SELECT',
  TRIAGE_LOADING: 'TRIAGE_LOADING',
  TRIAGE_RESULT:  'TRIAGE_RESULT',
  REFERRAL_CARD:  'REFERRAL_CARD',
  HISTORY:        'HISTORY',
  FACILITIES:     'FACILITIES',
  SOS:            'SOS',
};

// ────────────────────────────────────────────────────────
// Triage symptom checklist
// ────────────────────────────────────────────────────────
const TRIAGE_SYMPTOMS = [
  { id: 'heavyBleeding', key: '1', en: 'Heavy bleeding',     hi: 'अत्यधिक रक्तस्राव', w: 3 },
  { id: 'fatigue',       key: '2', en: 'Fatigue/tiredness',   hi: 'थकान',               w: 1 },
  { id: 'dizziness',     key: '3', en: 'Dizziness/fainting',  hi: 'चक्कर आना',          w: 2 },
  { id: 'pain',          key: '4', en: 'Severe pain',         hi: 'तेज़ दर्द',           w: 2 },
  { id: 'vomiting',      key: '5', en: 'Persistent vomiting', hi: 'लगातार उल्टी',       w: 2 },
  { id: 'fever',         key: '6', en: 'Fever > 3 days',      hi: '3 दिन से बुखार',     w: 2 },
];

// ────────────────────────────────────────────────────────
// Health tips (TTS)
// ────────────────────────────────────────────────────────
const HEALTH_TIPS = [
  { en: 'Drink at least 8 glasses of water daily to stay hydrated and reduce fatigue.',
    hi: 'हर दिन कम से कम 8 गिलास पानी पिएं। इससे थकान कम होती है।' },
  { en: 'Eat green leafy vegetables and jaggery to maintain iron levels and prevent anaemia.',
    hi: 'हरी पत्तेदार सब्ज़ियां और गुड़ खाएं। इससे खून की कमी नहीं होती।' },
  { en: 'Walk for 30 minutes daily. It helps reduce period pain and improves mood.',
    hi: 'रोज़ 30 मिनट पैदल चलें। इससे माहवारी का दर्द कम होता है।' },
  { en: 'Use a clean cloth or sanitary pad. Change every 4-6 hours.',
    hi: 'माहवारी में साफ कपड़ा या पैड इस्तेमाल करें। हर 4-6 घंटे बदलें।' },
  { en: 'If very dizzy, lie down and drink ORS or salted water immediately.',
    hi: 'अगर बहुत चक्कर आए तो लेट जाएं और तुरंत ORS या नमक-पानी पिएं।' },
  { en: 'Take an iron tablet daily if advised by your ASHA worker or doctor.',
    hi: 'ASHA दीदी या डॉक्टर ने कहा हो तो रोज़ एक आयरन की गोली लें।' },
  { en: 'Wash hands with soap before eating and after using the toilet.',
    hi: 'खाना खाने से पहले और शौचालय के बाद साबुन से हाथ धोएं।' },
  { en: 'Sleep at least 7-8 hours every night for better health and immunity.',
    hi: 'हर रात 7-8 घंटे सोएं। इससे सेहत और इम्यूनिटी अच्छी रहती है।' },
];

// ────────────────────────────────────────────────────────
// USSD Dial-code
// ────────────────────────────────────────────────────────
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

  // ── helpers ──────────────────────────────────────────
  const speak = useCallback(
    (text) => {
      if (!ttsOn) return;
      Speech.stop();
      Speech.speak(text, { language: hi ? 'hi-IN' : 'en-IN', rate: 0.85, pitch: 1.0 });
    },
    [ttsOn, hi],
  );

  /** Append a line to the USSD session log. */
  const log = useCallback((sender, text) => {
    setSessionLog((prev) => [...prev, { sender, text, ts: Date.now() }]);
  }, []);

  const scrollDown = () =>
    setTimeout(() => logRef.current?.scrollToEnd({ animated: true }), 150);

  /** Navigate to a screen with haptic + scroll. */
  const go = useCallback(
    (target) => {
      Vibration.vibrate(40);
      setScreen(target);
      scrollDown();
    },
    [],
  );

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

  // ── auto-speak on screen change ─────────────────────
  useEffect(() => {
    if (screen === S.CONNECTING) {
      Vibration.vibrate([0, 200, 150, 200]);
      const msg = hi
        ? `AuraHealth IVR में स्वागत है, ${user?.name || ''}। कृपया प्रतीक्षा करें…`
        : `Welcome to AuraHealth IVR, ${user?.name || ''}. Please wait…`;
      log('SYS', msg);
      speak(msg);
      const t = setTimeout(() => {
        go(S.MAIN_MENU);
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [screen]);

  useEffect(() => {
    if (screen === S.MAIN_MENU) {
      const menu = hi
        ? '1: माहवारी पूर्वानुमान\n2: AI स्वास्थ्य सलाह\n3: स्वास्थ्य टिप्स (TTS)\n4: लक्षण जांच + रेफ़रल\n5: रेफ़रल इतिहास\n6: नज़दीकी सुविधाएं\n9: आपातकालीन SOS\n0: वापस  #: कॉल समाप्त'
        : '1: Cycle prediction\n2: AI health advice\n3: Health tips (TTS)\n4: Symptom triage + referral\n5: Referral history\n6: Nearby facilities\n9: Emergency SOS\n0: Back  #: End call';
      log('IVR', menu);
      speak(
        hi
          ? '1 दबाएं माहवारी पूर्वानुमान, 2 AI सलाह, 3 टिप्स, 4 लक्षण जांच, 5 इतिहास, 6 सुविधाएं, 9 आपातकालीन, हैश कॉल समाप्त'
          : 'Press 1 cycle prediction, 2 AI advice, 3 tips, 4 triage, 5 history, 6 facilities, 9 emergency, hash to end call',
      );
    }
  }, [screen]);

  // ── Option 1: Cycle prediction ──────────────────────
  useEffect(() => {
    if (screen !== S.CYCLE) return;
    const date = cycle.nextPeriodDate || (hi ? 'अज्ञात' : 'Unknown');
    const days =
      cycle.daysUntilNextPeriod != null
        ? `${cycle.daysUntilNextPeriod} ${hi ? 'दिन शेष' : 'days left'}`
        : hi ? 'डेटा अपर्याप्त' : 'Not enough data';
    const len = `${cycle.cycleLength} ${hi ? 'दिन का चक्र' : 'day cycle'}`;

    const msg = hi
      ? `📅 अगली माहवारी: ${date}\n⏳ ${days}\n🔄 औसत: ${len}\n\n0: वापस`
      : `📅 Next period: ${date}\n⏳ ${days}\n🔄 Average: ${len}\n\n0: Back`;
    log('IVR', msg);
    speak(hi ? `अगली माहवारी ${date}, ${days}, औसत ${len}` : `Next period ${date}, ${days}, average ${len}`);
  }, [screen]);

  // ── Option 2: AI advice ─────────────────────────────
  const fetchAdvice = async () => {
    setLoading(true);
    setAdviceText('');
    log('IVR', hi ? '⏳ Gemini AI से सलाह ले रहे हैं…' : '⏳ Fetching advice from Gemini AI…');
    try {
      const profile = await getUserProfile();
      const prompt = hi
        ? `मैं ${profile?.age || ''} वर्ष की हूँ। मेरे चक्र की लंबाई ${cycle.cycleLength} दिन है। सरल भाषा में स्वास्थ्य सलाह दें। 5 पंक्तियों से ज़्यादा नहीं।`
        : `I am a ${profile?.age || ''} year old woman with a ${cycle.cycleLength}-day cycle. Give brief wellness tips in simple language. Max 5 lines.`;
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
  };

  useEffect(() => {
    if (screen === S.ADVICE_LOADING) fetchAdvice();
  }, [screen]);

  // ── Option 3: TTS tips ──────────────────────────────
  const speakCurrentTip = useCallback(
    (idx) => {
      const tip = HEALTH_TIPS[idx];
      const text = hi ? tip.hi : tip.en;
      log('IVR', `💡 (${idx + 1}/${HEALTH_TIPS.length}) ${text}`);
      speak(text);
    },
    [hi, speak, log],
  );

  useEffect(() => {
    if (screen === S.TIPS) speakCurrentTip(tipIndex);
  }, [screen]);

  // ── Option 4: Triage ───────────────────────────────
  useEffect(() => {
    if (screen === S.TRIAGE_SELECT) {
      const lines = TRIAGE_SYMPTOMS.map(
        (s) => `${s.key}: ${hi ? s.hi : s.en}`,
      ).join('\n');
      log(
        'IVR',
        hi
          ? `🩺 लक्षण चुनें (नंबर दबाएं):\n${lines}\n\n* दबाएं: जांच चलाएं\n0: वापस`
          : `🩺 Select symptoms (press number):\n${lines}\n\nPress *: Run triage\n0: Back`,
      );
      speak(hi ? 'अपने लक्षणों के नंबर दबाएं। फिर स्टार दबाकर जांच करें।' : 'Press symptom numbers, then star to run triage.');
    }
  }, [screen]);

  const toggleSymptom = (id) =>
    setSelectedSymptoms((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const runTriage = async () => {
    if (selectedSymptoms.length === 0) return;
    setLoading(true);
    go(S.TRIAGE_LOADING);
    log('IVR', hi ? '⏳ AI जांच चल रही है…' : '⏳ Running AI triage…');

    try {
      const score = selectedSymptoms.reduce((s, id) => {
        const sym = TRIAGE_SYMPTOMS.find((t) => t.id === id);
        return s + (sym?.w || 1);
      }, 0);

      let level, message;
      if (score >= 6) {
        level = 'HIGH';
        message = hi
          ? '⚠️ उच्च जोखिम — तुरंत स्वास्थ्य केंद्र जाएं!'
          : '⚠️ HIGH risk — seek immediate medical attention!';
      } else if (score >= 3) {
        level = 'MODERATE';
        message = hi
          ? '⚡ मध्यम जोखिम — जल्द ASHA दीदी या PHC जाएं।'
          : '⚡ MODERATE risk — visit ASHA worker or PHC soon.';
      } else {
        level = 'LOW';
        message = hi
          ? '✅ कम जोखिम — घर पर देखभाल करें। बढ़े तो डॉक्टर मिलें।'
          : '✅ LOW risk — home care okay. See doctor if worse.';
      }

      const symptomNames = selectedSymptoms
        .map((id) => { const s = TRIAGE_SYMPTOMS.find((t) => t.id === id); return s ? (hi ? s.hi : s.en) : id; })
        .join(', ');

      let aiAdvice = '';
      try {
        const prompt = hi
          ? `ग्रामीण मरीज़ के लक्षण: ${symptomNames}। जोखिम: ${level}। सरल हिंदी में 4 पंक्तियों में सलाह दें। OTC दवा सुझाएं।`
          : `Rural patient symptoms: ${symptomNames}. Risk: ${level}. Give 4-line simple advice + safe OTC medication names available in India.`;
        aiAdvice = await getHealthAdvice(prompt, language);
      } catch (_) {
        aiAdvice = hi ? 'AI सलाह अभी उपलब्ध नहीं।' : 'AI advice unavailable.';
      }

      // Select facility by severity
      const facility =
        level === 'HIGH'  ? FACILITY_DIRECTORY.find((f) => f.type === 'District Hospital') :
        level === 'MODERATE' ? FACILITY_DIRECTORY.find((f) => f.type === 'PHC') :
        FACILITY_DIRECTORY.find((f) => f.type === 'ASHA Worker');

      const result = {
        level, score, message, aiAdvice, symptoms: symptomNames,
        facility: facility || FACILITY_DIRECTORY[0],
        timestamp: new Date().toISOString(),
        userName: user?.name || 'User',
      };
      setTriageResult(result);
      await saveReferral(result);

      log('IVR', `${message}\n\n${hi ? 'लक्षण' : 'Symptoms'}: ${symptomNames}`);
      log('AI', aiAdvice);
      log('IVR', `📍 ${hi ? 'रेफ़र' : 'Refer'}: ${result.facility.name} (${result.facility.dist} km) — ${result.facility.phone}`);
      speak(message);
    } catch (e) {
      log('ERR', e.message);
    }
    setLoading(false);
    go(S.TRIAGE_RESULT);
  };

  // ── Option 6: Facilities ────────────────────────────
  useEffect(() => {
    if (screen === S.FACILITIES) {
      const lines = FACILITY_DIRECTORY.map(
        (f, i) => `${i + 1}. ${f.name}\n   ${f.type} — ${f.dist} km — ☎ ${f.phone}`,
      ).join('\n');
      const msg = hi ? `🏥 नज़दीकी सुविधाएं:\n\n${lines}\n\n0: वापस` : `🏥 Nearby Facilities:\n\n${lines}\n\n0: Back`;
      log('IVR', msg);
      speak(hi ? 'नज़दीकी सुविधाओं की सूची दिखाई गई है' : 'Showing nearby facility list');
    }
  }, [screen]);

  // ── Option 5: History ───────────────────────────────
  useEffect(() => {
    if (screen === S.HISTORY) {
      loadReferralHistory().then(() => {});
    }
  }, [screen]);

  useEffect(() => {
    if (screen === S.HISTORY && referralHistory.length > 0) {
      const items = referralHistory.slice(-5).reverse().map((r, i) => {
        const d = new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN');
        return `${i + 1}. ${d} | ${r.level} | ${r.facility?.name || '—'}`;
      }).join('\n');
      log('IVR', hi ? `📜 पिछले रेफ़रल:\n${items}\n\n0: वापस` : `📜 Past referrals:\n${items}\n\n0: Back`);
    } else if (screen === S.HISTORY) {
      log('IVR', hi ? '📜 कोई रिकॉर्ड नहीं।\n\n0: वापस' : '📜 No records yet.\n\n0: Back');
    }
  }, [screen, referralHistory]);

  // ── Option 9: SOS ───────────────────────────────────
  useEffect(() => {
    if (screen === S.SOS) {
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
      const sos = hi
        ? '🚨 आपातकालीन!\n\n1: ASHA दीदी को कॉल करें (9876543210)\n2: 108 एम्बुलेंस\n3: 112 हेल्पलाइन\n\n0: वापस'
        : '🚨 EMERGENCY!\n\n1: Call ASHA worker (9876543210)\n2: 108 Ambulance\n3: 112 Helpline\n\n0: Back';
      log('SOS', sos);
      speak(hi ? 'आपातकालीन मोड। ASHA दीदी, एम्बुलेंस, या हेल्पलाइन चुनें।' : 'Emergency mode. Choose ASHA, ambulance, or helpline.');
    }
  }, [screen]);

  const dialPhone = (number) => {
    const url = Platform.OS === 'ios' ? `telprompt:${number}` : `tel:${number}`;
    Linking.openURL(url).catch(() => {});
  };

  // ── Referral card ───────────────────────────────────
  useEffect(() => {
    if (screen === S.REFERRAL_CARD && triageResult) {
      const r = triageResult;
      const card = [
        '┌───── REFERRAL CARD ─────┐',
        `│ ${hi ? 'नाम' : 'Name'}: ${r.userName}`,
        `│ ${hi ? 'दिनांक' : 'Date'}: ${new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}`,
        `│ ${hi ? 'जोखिम' : 'Risk'}: ${r.level}`,
        `│ ${hi ? 'लक्षण' : 'Symptoms'}: ${r.symptoms}`,
        '│─────────────────────────│',
        `│ ${hi ? 'रेफ़र' : 'Refer to'}: ${r.facility.name}`,
        `│ ${r.facility.type} — ${r.facility.dist} km`,
        `│ ☎ ${r.facility.phone}`,
        '└─────────────────────────┘',
        '',
        hi ? '0: वापस' : '0: Back',
      ].join('\n');
      log('REF', card);
      speak(hi ? `रेफ़रल कार्ड: ${r.facility.name} को रेफ़र किया गया।` : `Referral card: referred to ${r.facility.name}.`);
    }
  }, [screen]);

  // ══════════════════════════════════════════════════════
  // Dial-pad key handler (the core IVR dispatcher)
  // ══════════════════════════════════════════════════════
  const handleKey = useCallback(
    (key) => {
      Vibration.vibrate(30);
      log('YOU', key);

      // Global keys
      if (key === '#') {
        // Hang up
        Speech.stop();
        setScreen(S.IDLE);
        setSessionLog([]);
        setSelectedSymptoms([]);
        setTriageResult(null);
        return;
      }

      // ── per-screen dispatch ──────────────────────────
      switch (screen) {
        case S.IDLE:
          if (key === '*' || key === 'CALL') {
            go(S.CONNECTING);
          }
          break;

        case S.MAIN_MENU:
          if (key === '1') go(S.CYCLE);
          else if (key === '2') go(S.ADVICE_LOADING);
          else if (key === '3') { setTipIndex(0); go(S.TIPS); }
          else if (key === '4') { setSelectedSymptoms([]); go(S.TRIAGE_SELECT); }
          else if (key === '5') go(S.HISTORY);
          else if (key === '6') go(S.FACILITIES);
          else if (key === '9') go(S.SOS);
          break;

        case S.CYCLE:
        case S.ADVICE_RESULT:
        case S.FACILITIES:
        case S.HISTORY:
          if (key === '0') go(S.MAIN_MENU);
          break;

        case S.TIPS:
          if (key === '0') go(S.MAIN_MENU);
          else if (key === '1') {
            // Next tip
            const next = (tipIndex + 1) % HEALTH_TIPS.length;
            setTipIndex(next);
            speakCurrentTip(next);
          } else if (key === '2') {
            // Repeat
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
              log('IVR', selected ? `➖ ${label}` : `➕ ${label}`);
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

        case S.SOS:
          if (key === '0') go(S.MAIN_MENU);
          else if (key === '1') dialPhone('9876543210');
          else if (key === '2') dialPhone('108');
          else if (key === '3') dialPhone('112');
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

      {/* ── USSD session log ──────────────────────── */}
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
          else if (isSOS) tagColor = '#f44';
          else if (isAI) tagColor = '#ff0';
          else if (isREF) tagColor = '#f90';
          else if (isERR) tagColor = '#f44';

          return (
            <View key={i} style={styles.logEntry}>
              <Text style={[styles.logTag, { color: tagColor }]}>
                {entry.sender}
              </Text>
              <Text style={[styles.logText, isSOS && { color: '#f44' }, isREF && { color: '#f90' }]}>
                {entry.text}
              </Text>
            </View>
          );
        })}

        {/* Loading indicator */}
        {loading && (
          <View style={styles.logEntry}>
            <Text style={[styles.logTag, { color: '#ff0' }]}>SYS</Text>
            <ActivityIndicator color="#0f0" size="small" />
          </View>
        )}

        {/* Triage-result sub-menu */}
        {screen === S.TRIAGE_RESULT && triageResult && !loading && (
          <View style={styles.logEntry}>
            <Text style={[styles.logTag, { color: '#0f0' }]}>IVR</Text>
            <Text style={styles.logText}>
              {hi
                ? '1: रेफ़रल कार्ड देखें\n2: सलाह सुनें\n0: वापस'
                : '1: View referral card\n2: Listen to advice\n0: Back'}
            </Text>
          </View>
        )}

        {/* Tips sub-menu */}
        {screen === S.TIPS && !loading && (
          <View style={styles.logEntry}>
            <Text style={[styles.logTag, { color: '#0f0' }]}>IVR</Text>
            <Text style={styles.logText}>
              {hi ? '1: अगला  2: दोहराएं  0: वापस' : '1: Next  2: Repeat  0: Back'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Dial pad ──────────────────────────────── */}
      <View style={styles.padContainer}>
        {DIAL_KEYS.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((k) => {
              // Highlight special keys
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
                    <Text
                      style={[
                        styles.padKeyText,
                        isHash && { color: '#fff' },
                        isStar && { color: '#000' },
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
