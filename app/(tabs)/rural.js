/**
 * IVR Rural Mode — Simulated missed-call IVR system
 *
 * A USSD-style, black/green "terminal" interface designed for low-literacy
 * rural users. Navigation is entirely through numbered options, with
 * Hindi TTS read-aloud, Gemini AI advice, cycle prediction, and
 * referral generation with nearest-facility mapping.
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Phone, Volume2, VolumeX, ArrowLeft, MapPin } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLanguage } from '../../src/context/LanguageContext';
import { useAuth } from '../../src/context/AuthContext';
import { useCycleTracker } from '../../src/hooks/useCycleTracker';
import { getHealthAdvice } from '../../src/api/gemini';
import { getUserProfile, getRiskHistory, performRiskAssessment } from '../../src/services/HealthDataLogger';
import { scopedKey } from '../../src/services/authService';

// ────────────────────────────────────────────────────────
// Hospital / PHC directory (demo data — extendable)
// ────────────────────────────────────────────────────────
const FACILITY_DIRECTORY = [
  { name: 'PHC Rampur',          type: 'PHC',              dist: 3,  phone: '01onal-1234' },
  { name: 'CHC Barabanki',       type: 'CHC',              dist: 8,  phone: '01onal-5678' },
  { name: 'District Hospital',   type: 'District Hospital', dist: 15, phone: '01onal-9012' },
  { name: 'Sub-Centre Mohali',   type: 'Sub-Centre',       dist: 1,  phone: 'N/A' },
  { name: 'ASHA Worker Sushila', type: 'ASHA',             dist: 0,  phone: '9876543210' },
];

// ────────────────────────────────────────────────────────
// State-machine screens
// ────────────────────────────────────────────────────────
const SCREENS = {
  WELCOME: 'WELCOME',
  MAIN_MENU: 'MAIN_MENU',
  CYCLE_PREDICTION: 'CYCLE_PREDICTION',
  HEALTH_ADVICE: 'HEALTH_ADVICE',
  HEALTH_ADVICE_RESULT: 'HEALTH_ADVICE_RESULT',
  TTS_TIPS: 'TTS_TIPS',
  TRIAGE: 'TRIAGE',
  TRIAGE_RESULT: 'TRIAGE_RESULT',
  REFERRAL: 'REFERRAL',
  HISTORY: 'HISTORY',
};

// ────────────────────────────────────────────────────────
// Triage symptom checklist
// ────────────────────────────────────────────────────────
const TRIAGE_SYMPTOMS = [
  { id: 'heavyBleeding',   en: 'Heavy bleeding',       hi: 'अत्यधिक रक्तस्राव' },
  { id: 'fatigue',         en: 'Fatigue / tiredness',   hi: 'थकान' },
  { id: 'dizziness',       en: 'Dizziness / fainting',  hi: 'चक्कर आना' },
  { id: 'pain',            en: 'Severe pain',           hi: 'तेज़ दर्द' },
  { id: 'vomiting',        en: 'Persistent vomiting',   hi: 'लगातार उल्टी' },
  { id: 'fever',           en: 'Fever > 3 days',        hi: '3 दिन से बुखार' },
];

// ────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────
export default function RuralIVRScreen() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { nextPeriodDate, daysUntilNextPeriod, cycleLength, isLoading: cycleLoading } = useCycleTracker();
  const scrollRef = useRef(null);

  const hi = language === 'hi';

  // State-machine
  const [screen, setScreen] = useState(SCREENS.WELCOME);
  const [ttsOn, setTtsOn] = useState(true);
  const [loading, setLoading] = useState(false);

  // Advice result
  const [adviceText, setAdviceText] = useState('');

  // Triage state
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [triageResult, setTriageResult] = useState(null);

  // Referral state
  const [referral, setReferral] = useState(null);

  // History
  const [referralHistory, setReferralHistory] = useState([]);

  // ── helpers ──────────────────────────────────────────
  const speak = useCallback(
    (text) => {
      if (!ttsOn) return;
      Speech.stop();
      Speech.speak(text, {
        language: hi ? 'hi-IN' : 'en-IN',
        rate: 0.85,
        pitch: 1.0,
      });
    },
    [ttsOn, hi],
  );

  const scrollToEnd = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);

  // ── Welcome auto-advance ────────────────────────────
  useEffect(() => {
    if (screen === SCREENS.WELCOME) {
      Vibration.vibrate(200);
      const msg = hi
        ? 'AuraHealth IVR में आपका स्वागत है। कृपया प्रतीक्षा करें…'
        : 'Welcome to AuraHealth IVR. Please wait…';
      speak(msg);
      const timer = setTimeout(() => setScreen(SCREENS.MAIN_MENU), 2500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  // ── Read main menu aloud ────────────────────────────
  useEffect(() => {
    if (screen === SCREENS.MAIN_MENU) {
      const msg = hi
        ? 'मुख्य मेनू। 1 दबाएं: अगली माहवारी, 2 दबाएं: AI स्वास्थ्य सलाह, 3 दबाएं: हिंदी स्वास्थ्य टिप्स, 4 दबाएं: लक्षण जांच और रेफ़रल।'
        : 'Main menu. Press 1 for Cycle prediction. Press 2 for AI health advice. Press 3 for Hindi health tips. Press 4 for Symptom triage and referral.';
      speak(msg);
    }
  }, [screen]);

  // ── Load referral history ────────────────────────────
  const loadReferralHistory = async () => {
    try {
      const key = scopedKey('aurahealth_ivr_referrals');
      const raw = await AsyncStorage.getItem(key);
      setReferralHistory(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.warn('[IVR] Error loading referral history', e);
    }
  };

  const saveReferral = async (ref) => {
    try {
      const key = scopedKey('aurahealth_ivr_referrals');
      const existing = referralHistory || [];
      const updated = [...existing, ref].slice(-50);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setReferralHistory(updated);
    } catch (e) {
      console.warn('[IVR] Error saving referral', e);
    }
  };

  // ── Navigation helper ───────────────────────────────
  const go = (target) => {
    Vibration.vibrate(50);
    setScreen(target);
    scrollToEnd();
  };

  // ── Option 1 — Cycle Prediction ────────────────────
  const renderCyclePrediction = () => {
    const dateText = nextPeriodDate || (hi ? 'अज्ञात' : 'Unknown');
    const daysText =
      daysUntilNextPeriod != null
        ? `${daysUntilNextPeriod} ${hi ? 'दिन शेष' : 'days left'}`
        : hi
        ? 'डेटा अपर्याप्त'
        : 'Not enough data';
    const cycleLenText = `${cycleLength} ${hi ? 'दिन का चक्र' : 'day cycle'}`;

    const msg = hi
      ? `अगली माहवारी: ${dateText}, ${daysText}। औसत ${cycleLenText}।`
      : `Next period: ${dateText}, ${daysText}. Average ${cycleLenText}.`;

    // Speak it
    speak(msg);

    return (
      <View>
        <Text style={styles.sectionHeader}>{hi ? '📅 माहवारी पूर्वानुमान' : '📅 Cycle Prediction'}</Text>
        <Text style={styles.termLine}>
          {hi ? 'अगली माहवारी' : 'Next period'}: <Text style={styles.highlight}>{dateText}</Text>
        </Text>
        <Text style={styles.termLine}>
          {hi ? 'शेष दिन' : 'Days left'}: <Text style={styles.highlight}>{daysText}</Text>
        </Text>
        <Text style={styles.termLine}>
          {hi ? 'औसत चक्र' : 'Avg. cycle'}: <Text style={styles.highlight}>{cycleLenText}</Text>
        </Text>
        {renderBackButton()}
      </View>
    );
  };

  // ── Option 2 — Gemini Health Advice ─────────────────
  const fetchAdvice = async () => {
    setLoading(true);
    setAdviceText('');
    try {
      const profile = await getUserProfile();
      const prompt = hi
        ? `मैं ${profile?.age || ''} वर्ष की हूँ। मेरे चक्र की लंबाई ${cycleLength} दिन है। मुझे सरल भाषा में स्वास्थ्य सलाह दें।`
        : `I am a ${profile?.age || ''} year old woman with a ${cycleLength}-day cycle. Give me brief wellness tips in simple language.`;
      const result = await getHealthAdvice(prompt, language);
      setAdviceText(result);
      speak(result);
    } catch (e) {
      const errMsg = hi ? 'सलाह लोड नहीं हो सकी। बाद में पुनः प्रयास करें।' : 'Could not load advice. Try again later.';
      setAdviceText(errMsg);
      speak(errMsg);
    }
    setLoading(false);
    go(SCREENS.HEALTH_ADVICE_RESULT);
  };

  const renderHealthAdvice = () => (
    <View>
      <Text style={styles.sectionHeader}>{hi ? '🤖 AI स्वास्थ्य सलाह' : '🤖 AI Health Advice'}</Text>
      <Text style={styles.termLine}>{hi ? 'Gemini AI से सलाह माँगी जा रही है…' : 'Fetching advice from Gemini AI…'}</Text>
      <ActivityIndicator color="#0f0" style={{ marginVertical: 16 }} />
    </View>
  );

  const renderHealthAdviceResult = () => (
    <View>
      <Text style={styles.sectionHeader}>{hi ? '🤖 AI सलाह' : '🤖 AI Advice'}</Text>
      <Text style={styles.adviceBlock}>{adviceText}</Text>
      {renderBackButton()}
    </View>
  );

  // ── Option 3 — Hindi TTS Health Tips ────────────────
  const TIPS = [
    { en: 'Drink at least 8 glasses of water every day to stay hydrated and reduce fatigue.',
      hi: 'हर दिन कम से कम 8 गिलास पानी पिएं। इससे थकान कम होती है।' },
    { en: 'Eat green leafy vegetables and jaggery to maintain iron levels and prevent anaemia.',
      hi: 'हरी पत्तेदार सब्ज़ियां और गुड़ खाएं। इससे खून की कमी नहीं होती।' },
    { en: 'Walk for 30 minutes daily. It helps reduce period pain and improves mood.',
      hi: 'रोज़ 30 मिनट पैदल चलें। इससे माहवारी का दर्द कम होता है।' },
    { en: 'Use a clean cloth or sanitary pad during your period. Change every 4-6 hours.',
      hi: 'माहवारी में साफ कपड़ा या पैड इस्तेमाल करें। हर 4-6 घंटे बदलें।' },
    { en: 'If you feel very dizzy or faint, lie down and drink ORS or salted water immediately.',
      hi: 'अगर बहुत चक्कर आए तो लेट जाएं और तुरंत ORS या नमक-पानी पिएं।' },
  ];

  const [currentTip, setCurrentTip] = useState(0);

  const renderTTSTips = () => {
    const tip = TIPS[currentTip];
    const text = hi ? tip.hi : tip.en;
    speak(text);

    return (
      <View>
        <Text style={styles.sectionHeader}>{hi ? '🔊 स्वास्थ्य टिप्स' : '🔊 Health Tips (TTS)'}</Text>
        <Text style={styles.tipText}>{text}</Text>
        <Text style={styles.dimText}>
          {currentTip + 1} / {TIPS.length}
        </Text>
        <View style={styles.tipNav}>
          <TouchableOpacity
            style={[styles.numBtn, { flex: 1 }]}
            onPress={() => {
              Speech.stop();
              setCurrentTip((currentTip + 1) % TIPS.length);
            }}
          >
            <Text style={styles.numBtnText}>{hi ? 'अगला ▶' : 'Next ▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.numBtn, { flex: 1, marginLeft: 8 }]}
            onPress={() => speak(text)}
          >
            <Text style={styles.numBtnText}>{hi ? '🔁 दोहराएं' : '🔁 Repeat'}</Text>
          </TouchableOpacity>
        </View>
        {renderBackButton()}
      </View>
    );
  };

  // ── Option 4 — AI Triage + Referral ─────────────────
  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const runTriage = async () => {
    setLoading(true);
    try {
      // Simple severity score based on symptom count + weighting
      const weights = { heavyBleeding: 3, dizziness: 2, pain: 2, vomiting: 2, fatigue: 1, fever: 2 };
      const score = selectedSymptoms.reduce((s, id) => s + (weights[id] || 1), 0);

      let level, message;
      if (score >= 6) {
        level = 'HIGH';
        message = hi
          ? '⚠️ उच्च जोखिम — तुरंत स्वास्थ्य केंद्र जाएं।'
          : '⚠️ HIGH risk — seek immediate medical attention.';
      } else if (score >= 3) {
        level = 'MODERATE';
        message = hi
          ? '⚡ मध्यम जोखिम — जल्द ASHA कार्यकर्ता या PHC से मिलें।'
          : '⚡ MODERATE risk — visit ASHA worker or PHC soon.';
      } else {
        level = 'LOW';
        message = hi
          ? '✅ कम जोखिम — घर पर देखभाल करें, लक्षण बढ़ें तो डॉक्टर से मिलें।'
          : '✅ LOW risk — home care is okay; see a doctor if symptoms worsen.';
      }

      // Get Gemini AI opinion
      const symptomNames = selectedSymptoms
        .map((id) => {
          const s = TRIAGE_SYMPTOMS.find((t) => t.id === id);
          return s ? (hi ? s.hi : s.en) : id;
        })
        .join(', ');

      let aiAdvice = '';
      try {
        const prompt = hi
          ? `मरीज़ के लक्षण: ${symptomNames}। जोखिम स्तर: ${level}। सरल भाषा में 3 पंक्तियों में सलाह दें।`
          : `Patient symptoms: ${symptomNames}. Risk: ${level}. Give 3-line simple advice.`;
        aiAdvice = await getHealthAdvice(prompt, language);
      } catch (_) {
        aiAdvice = hi ? 'AI सलाह अभी उपलब्ध नहीं।' : 'AI advice unavailable right now.';
      }

      // Pick nearest facility
      const facility =
        level === 'HIGH'
          ? FACILITY_DIRECTORY.find((f) => f.type === 'District Hospital') || FACILITY_DIRECTORY[2]
          : level === 'MODERATE'
          ? FACILITY_DIRECTORY.find((f) => f.type === 'PHC') || FACILITY_DIRECTORY[0]
          : FACILITY_DIRECTORY.find((f) => f.type === 'ASHA') || FACILITY_DIRECTORY[4];

      const result = {
        level,
        score,
        message,
        aiAdvice,
        symptoms: symptomNames,
        facility,
        timestamp: new Date().toISOString(),
      };

      setTriageResult(result);

      // Save referral
      await saveReferral(result);

      speak(message);
    } catch (e) {
      console.error('[IVR] Triage error', e);
    }
    setLoading(false);
    go(SCREENS.TRIAGE_RESULT);
  };

  const renderTriage = () => (
    <View>
      <Text style={styles.sectionHeader}>{hi ? '🩺 लक्षण जांच' : '🩺 Symptom Triage'}</Text>
      <Text style={styles.termLine}>{hi ? 'अपने लक्षण चुनें:' : 'Select your symptoms:'}</Text>
      {TRIAGE_SYMPTOMS.map((s) => {
        const selected = selectedSymptoms.includes(s.id);
        return (
          <TouchableOpacity
            key={s.id}
            style={[styles.symptomRow, selected && styles.symptomRowSelected]}
            onPress={() => toggleSymptom(s.id)}
          >
            <Text style={styles.symptomCheck}>{selected ? '☑' : '☐'}</Text>
            <Text style={styles.symptomLabel}>{hi ? s.hi : s.en}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={[styles.numBtn, { marginTop: 16 }, selectedSymptoms.length === 0 && { opacity: 0.4 }]}
        disabled={selectedSymptoms.length === 0 || loading}
        onPress={runTriage}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.numBtnText}>{hi ? '▶ जांच करें' : '▶ Run Triage'}</Text>
        )}
      </TouchableOpacity>
      {renderBackButton()}
    </View>
  );

  const renderTriageResult = () => {
    if (!triageResult) return null;
    const { level, message, aiAdvice, symptoms, facility } = triageResult;
    const levelColor = level === 'HIGH' ? '#f44' : level === 'MODERATE' ? '#ff0' : '#0f0';

    return (
      <View>
        <Text style={styles.sectionHeader}>{hi ? '📋 जांच परिणाम' : '📋 Triage Result'}</Text>

        <View style={[styles.levelBadge, { borderColor: levelColor }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>{level} RISK</Text>
        </View>

        <Text style={styles.termLine}>{message}</Text>
        <Text style={[styles.termLine, { marginTop: 8 }]}>
          {hi ? 'लक्षण' : 'Symptoms'}: {symptoms}
        </Text>

        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
          {hi ? '🤖 AI सलाह' : '🤖 AI Advice'}
        </Text>
        <Text style={styles.adviceBlock}>{aiAdvice}</Text>

        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
          <MapPin size={14} color="#0f0" /> {hi ? ' निकटतम सुविधा' : ' Nearest Facility'}
        </Text>
        <View style={styles.facilityCard}>
          <Text style={styles.facilityName}>{facility.name}</Text>
          <Text style={styles.facilityInfo}>
            {facility.type} — {facility.dist} km {hi ? 'दूर' : 'away'}
          </Text>
          <Text style={styles.facilityInfo}>
            {hi ? 'फ़ोन' : 'Phone'}: {facility.phone}
          </Text>
        </View>

        <TouchableOpacity style={[styles.numBtn, { marginTop: 12 }]} onPress={() => speak(aiAdvice)}>
          <Text style={styles.numBtnText}>{hi ? '🔊 सलाह सुनें' : '🔊 Listen to advice'}</Text>
        </TouchableOpacity>

        {renderBackButton()}
      </View>
    );
  };

  // ── Referral card (stored) ──────────────────────────
  const renderReferral = () => {
    if (!triageResult) return null;
    const { facility, level, symptoms, timestamp } = triageResult;

    const refCard = {
      date: new Date(timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN'),
      userName: user?.name || (hi ? 'उपयोगकर्ता' : 'User'),
      level,
      symptoms,
      facilityName: facility.name,
      facilityType: facility.type,
      facilityDist: facility.dist,
      facilityPhone: facility.phone,
    };

    return (
      <View>
        <Text style={styles.sectionHeader}>{hi ? '🏥 रेफ़रल कार्ड' : '🏥 Referral Card'}</Text>
        <View style={styles.referralCard}>
          <Text style={styles.refTitle}>AuraHealth IVR Referral</Text>
          <Text style={styles.refLine}>{hi ? 'नाम' : 'Name'}: {refCard.userName}</Text>
          <Text style={styles.refLine}>{hi ? 'दिनांक' : 'Date'}: {refCard.date}</Text>
          <Text style={styles.refLine}>{hi ? 'जोखिम' : 'Risk'}: {refCard.level}</Text>
          <Text style={styles.refLine}>{hi ? 'लक्षण' : 'Symptoms'}: {refCard.symptoms}</Text>
          <View style={styles.refDivider} />
          <Text style={styles.refLine}>{hi ? 'रेफ़र' : 'Refer to'}: {refCard.facilityName}</Text>
          <Text style={styles.refLine}>{refCard.facilityType} — {refCard.facilityDist} km</Text>
          <Text style={styles.refLine}>{hi ? 'फ़ोन' : 'Phone'}: {refCard.facilityPhone}</Text>
        </View>
        {renderBackButton()}
      </View>
    );
  };

  // ── History ─────────────────────────────────────────
  const renderHistory = () => (
    <View>
      <Text style={styles.sectionHeader}>{hi ? '📜 पिछले रेफ़रल' : '📜 Referral History'}</Text>
      {referralHistory.length === 0 ? (
        <Text style={styles.termLine}>{hi ? 'कोई रिकॉर्ड नहीं।' : 'No records yet.'}</Text>
      ) : (
        referralHistory
          .slice(-10)
          .reverse()
          .map((r, i) => (
            <View key={i} style={styles.historyItem}>
              <Text style={styles.historyDate}>
                {new Date(r.timestamp).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}
              </Text>
              <Text style={[styles.historyLevel, { color: r.level === 'HIGH' ? '#f44' : r.level === 'MODERATE' ? '#ff0' : '#0f0' }]}>
                {r.level}
              </Text>
              <Text style={styles.historySymp} numberOfLines={1}>{r.symptoms}</Text>
              <Text style={styles.historyFac}>{r.facility?.name}</Text>
            </View>
          ))
      )}
      {renderBackButton()}
    </View>
  );

  // ── Back button helper ──────────────────────────────
  const renderBackButton = () => (
    <TouchableOpacity
      style={[styles.numBtn, { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
      onPress={() => {
        Speech.stop();
        go(SCREENS.MAIN_MENU);
      }}
    >
      <ArrowLeft size={16} color="#000" />
      <Text style={[styles.numBtnText, { marginLeft: 6 }]}>
        {hi ? '0 — मुख्य मेनू' : '0 — Main Menu'}
      </Text>
    </TouchableOpacity>
  );

  // ── Main Menu ───────────────────────────────────────
  const renderMainMenu = () => {
    const options = [
      { key: '1', label: hi ? 'अगली माहवारी पूर्वानुमान' : 'Next period prediction', target: SCREENS.CYCLE_PREDICTION },
      { key: '2', label: hi ? 'AI स्वास्थ्य सलाह (Gemini)' : 'AI health advice (Gemini)', target: SCREENS.HEALTH_ADVICE },
      { key: '3', label: hi ? 'हिंदी स्वास्थ्य टिप्स (TTS)' : 'Health tips (Hindi TTS)', target: SCREENS.TTS_TIPS },
      { key: '4', label: hi ? 'लक्षण जांच + रेफ़रल' : 'Symptom triage + referral', target: SCREENS.TRIAGE },
      { key: '5', label: hi ? 'रेफ़रल इतिहास' : 'Referral history', target: SCREENS.HISTORY },
    ];

    return (
      <View>
        <Text style={styles.sectionHeader}>{hi ? '📞 मुख्य मेनू' : '📞 Main Menu'}</Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={styles.menuRow}
            onPress={() => {
              if (opt.target === SCREENS.HEALTH_ADVICE) {
                go(SCREENS.HEALTH_ADVICE);
                fetchAdvice();
              } else if (opt.target === SCREENS.HISTORY) {
                loadReferralHistory();
                go(SCREENS.HISTORY);
              } else {
                go(opt.target);
              }
            }}
          >
            <View style={styles.menuKeyBadge}>
              <Text style={styles.menuKey}>{opt.key}</Text>
            </View>
            <Text style={styles.menuLabel}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Welcome splash ──────────────────────────────────
  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <Phone size={48} color="#0f0" />
      <Text style={styles.welcomeTitle}>AuraHealth IVR</Text>
      <Text style={styles.welcomeSub}>
        {hi ? 'कॉल कनेक्ट हो रही है…' : 'Connecting your call…'}
      </Text>
      <ActivityIndicator color="#0f0" style={{ marginTop: 16 }} />
    </View>
  );

  // ── Screen router ───────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case SCREENS.WELCOME:
        return renderWelcome();
      case SCREENS.MAIN_MENU:
        return renderMainMenu();
      case SCREENS.CYCLE_PREDICTION:
        return renderCyclePrediction();
      case SCREENS.HEALTH_ADVICE:
        return renderHealthAdvice();
      case SCREENS.HEALTH_ADVICE_RESULT:
        return renderHealthAdviceResult();
      case SCREENS.TTS_TIPS:
        return renderTTSTips();
      case SCREENS.TRIAGE:
        return renderTriage();
      case SCREENS.TRIAGE_RESULT:
        return renderTriageResult();
      case SCREENS.REFERRAL:
        return renderReferral();
      case SCREENS.HISTORY:
        return renderHistory();
      default:
        return renderMainMenu();
    }
  };

  // ── Render ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header bar */}
      <View style={styles.header}>
        <Phone size={20} color="#0f0" />
        <Text style={styles.headerTitle}>
          IVR {hi ? 'ग्रामीण मोड' : 'Rural Mode'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setTtsOn((v) => !v);
            if (ttsOn) Speech.stop();
          }}
          style={styles.ttsToggle}
        >
          {ttsOn ? <Volume2 size={20} color="#0f0" /> : <VolumeX size={20} color="#666" />}
        </TouchableOpacity>
      </View>

      {/* Terminal body */}
      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        onContentSizeChange={scrollToEnd}
      >
        {/* System banner */}
        <Text style={styles.systemLine}>
          ┌─────────────────────────────────┐{'\n'}
          │  AuraHealth IVR v1.0            │{'\n'}
          │  {hi ? 'ग्रामीण स्वास्थ्य सेवा' : 'Rural Health Service'}{'          '}│{'\n'}
          └─────────────────────────────────┘
        </Text>

        {renderScreen()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────
// Styles — black/green terminal theme
// ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#0f03',
  },
  headerTitle: {
    flex: 1,
    color: '#0f0',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginLeft: 10,
  },
  ttsToggle: {
    padding: 6,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  systemLine: {
    color: '#0a0',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  welcomeTitle: {
    color: '#0f0',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 16,
  },
  welcomeSub: {
    color: '#0a0',
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 8,
  },

  // Section
  sectionHeader: {
    color: '#0f0',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 12,
    marginTop: 8,
  },
  termLine: {
    color: '#0d0',
    fontSize: 15,
    fontFamily: 'monospace',
    lineHeight: 24,
  },
  highlight: {
    color: '#ff0',
    fontWeight: 'bold',
  },
  dimText: {
    color: '#666',
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 6,
  },

  // Menu
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  menuKeyBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuKey: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  menuLabel: {
    color: '#0d0',
    fontSize: 16,
    fontFamily: 'monospace',
    flex: 1,
  },

  // Buttons
  numBtn: {
    backgroundColor: '#0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  numBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'monospace',
  },

  // Advice
  adviceBlock: {
    color: '#0d0',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 22,
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0f03',
  },

  // Tips
  tipText: {
    color: '#ff0',
    fontSize: 16,
    fontFamily: 'monospace',
    lineHeight: 26,
    marginBottom: 8,
  },
  tipNav: {
    flexDirection: 'row',
    marginTop: 8,
  },

  // Symptom triage
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  symptomRowSelected: {
    backgroundColor: '#0f01',
  },
  symptomCheck: {
    color: '#0f0',
    fontSize: 20,
    fontFamily: 'monospace',
    marginRight: 12,
  },
  symptomLabel: {
    color: '#0d0',
    fontSize: 15,
    fontFamily: 'monospace',
  },

  // Level badge
  levelBadge: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  levelText: {
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'monospace',
  },

  // Facility card
  facilityCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#0f03',
    borderRadius: 8,
    padding: 12,
  },
  facilityName: {
    color: '#0f0',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  facilityInfo: {
    color: '#0a0',
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 2,
  },

  // Referral card
  referralCard: {
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#0f0',
    borderRadius: 10,
    padding: 16,
  },
  refTitle: {
    color: '#0f0',
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 10,
  },
  refLine: {
    color: '#0d0',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 22,
  },
  refDivider: {
    height: 1,
    backgroundColor: '#0f04',
    marginVertical: 10,
  },

  // History
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    flexWrap: 'wrap',
  },
  historyDate: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    width: 80,
  },
  historyLevel: {
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'monospace',
    width: 70,
  },
  historySymp: {
    color: '#0a0',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  historyFac: {
    color: '#0a0',
    fontSize: 12,
    fontFamily: 'monospace',
    width: '100%',
    marginTop: 2,
  },
});
