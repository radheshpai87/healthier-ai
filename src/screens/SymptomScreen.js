/**
 * SymptomScreen.js
 * ─────────────────────────────────────────────
 * Symptom entry form for health risk assessment.
 *
 * Features:
 *   - Toggle buttons for each symptom (yes/no)
 *   - Optional numeric Hb (hemoglobin) field
 *   - Pregnancy toggle
 *   - Emergency intensity flags
 *   - Submit → calculateRisk() → navigate to Result
 *   - Stores data locally (encrypted, anonymized)
 *
 * Designed for rural accessibility:
 *   - Large buttons, clear labels
 *   - Bilingual (EN/HI)
 *   - Minimal typing required
 * ─────────────────────────────────────────────
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../context/LanguageContext';
import SymptomToggle from '../components/SymptomToggle';
import { calculateRisk, enhancedRiskAssessment } from '../services/riskEngine';
import { saveHealthRecord, getVillageCode } from '../services/storageService';
import { getUserProfile } from '../services/HealthDataLogger';
import { SYMPTOM_WEIGHTS, EMERGENCY_INTENSITY } from '../utils/constants';

// ── Translations ───────────────────────────────
const t = {
  en: {
    title: 'Health Assessment',
    subtitle: 'Select all symptoms that apply',
    symptomsSection: 'Symptoms',
    heavyBleeding: 'Heavy Bleeding',
    fatigue: 'Fatigue / Tiredness',
    dizziness: 'Dizziness',
    irregularCycles: 'Irregular Periods',
    pain: 'Pain / Cramps',
    pregnancyIssue: 'Pregnancy Complication',
    hbSection: 'Hemoglobin Level',
    hbOptional: 'Optional',
    hbPlaceholder: 'Enter Hb value (e.g., 10.5)',
    hbNote: 'If Hb < 11 g/dL, it indicates anemia',
    emergencySection: 'Emergency Signs',
    emergencyNote: 'Select if experiencing right now',
    fainted: 'Fainted / Lost Consciousness',
    severePain: 'Severe Unbearable Pain',
    vomiting: 'Continuous Vomiting',
    submitBtn: 'Check Risk Level',
    assessing: 'Analysing...',
    // Lifestyle quick-input
    lifestyleQuick: 'Lifestyle Factors',
    lifestyleOptional: 'Optional',
    lifestyleQuickHint: 'Helps ML model give a better prediction',
    stressLabel: 'Stress Level',
    stressOpts: ['1-Low', '2', '3', '4', '5-High'],
    sleepLabel: 'Sleep (hrs/night)',
    sleepPlaceholder: 'e.g. 7',
    exerciseLabel: 'Exercise (days/week)',
    exercisePlaceholder: 'e.g. 3',
    durationLabel: 'When did symptoms start?',
    durationOpts: ['Today', 'Few Days', '1 Week+', 'Ongoing'],
    painIntensityLabel: 'Pain Intensity (1 = mild, 10 = worst)',
    bleedingLevelLabel: 'Bleeding Heaviness',
    bleedingLevelOpts: ['Light', 'Moderate', 'Heavy', 'Very Heavy'],
    fatigueLevelLabel: 'Fatigue Severity',
    fatigueLevelOpts: ['Mild', 'Moderate', 'Severe'],
    stepSymptoms: 'Step 1',
    stepHb: 'Step 2',
    stepEmergency: 'Step 3',
    stepLifestyle: 'Step 4',
  },
  hi: {
    title: 'स्वास्थ्य मूल्यांकन',
    subtitle: 'सभी लागू होने वाले लक्षण चुनें',
    symptomsSection: 'लक्षण',
    heavyBleeding: 'भारी रक्तस्राव',
    fatigue: 'थकान / कमजोरी',
    dizziness: 'चक्कर आना',
    irregularCycles: 'अनियमित माहवारी',
    pain: 'दर्द / ऐंठन',
    pregnancyIssue: 'गर्भावस्था जटिलता',
    hbSection: 'हीमोग्लोबिन स्तर',
    hbOptional: 'वैकल्पिक',
    hbPlaceholder: 'Hb मान दर्ज करें (जैसे 10.5)',
    hbNote: 'यदि Hb < 11 g/dL है, तो यह एनीमिया का संकेत है',
    emergencySection: 'आपातकालीन संकेत',
    emergencyNote: 'अभी अनुभव हो रहा हो तो चुनें',
    fainted: 'बेहोशी / चेतना खोई',
    severePain: 'तीव्र असहनीय दर्द',
    vomiting: 'लगातार उल्टी',
    submitBtn: 'जोखिम स्तर जांचें',
    assessing: 'जांच हो रही है...',
    lifestyleQuick: 'जीवनशैली कारक',
    lifestyleOptional: 'वैकल्पिक',
    lifestyleQuickHint: 'ML मॉडल को बेहतर भविष्यवाणी देने में मदद करता है',
    stressLabel: 'तनाव स्तर',
    stressOpts: ['1-कम', '2', '3', '4', '5-अधिक'],
    sleepLabel: 'नींद (घंटे/रात)',
    sleepPlaceholder: 'जैसे 7',
    exerciseLabel: 'व्यायाम (दिन/सप्ताह)',
    exercisePlaceholder: 'जैसे 3',
    durationLabel: 'लक्षण कब से हैं?',
    durationOpts: ['आज', 'कुछ दिन', '1 सप्ताह+', 'लंबे समय से'],
    painIntensityLabel: 'दर्द की तीव्रता (1=हल्का, 10=असहनीय)',
    bleedingLevelLabel: 'रक्तस्राव की मात्रा',
    bleedingLevelOpts: ['हल्का', 'मध्यम', 'भारी', 'बहुत भारी'],
    fatigueLevelLabel: 'थकान की तीव्रता',
    fatigueLevelOpts: ['हल्की', 'मध्यम', 'गंभीर'],
    stepSymptoms: 'चरण 1',
    stepHb: 'चरण 2',
    stepEmergency: 'चरण 3',
    stepLifestyle: 'चरण 4',
  },
};

export default function SymptomScreen() {
  const router = useRouter();
  const { language } = useContext(LanguageContext);
  const lang = language === 'hi' ? 'hi' : 'en';
  const texts = t[lang];

  // ── Symptom State ────────────────────────────
  const [symptoms, setSymptoms] = useState({
    heavyBleeding: false,
    fatigue: false,
    dizziness: false,
    lowHb: false,
    irregularCycles: false,
    pain: false,
    pregnancyIssue: false,
  });

  // ── Hemoglobin field ─────────────────────────
  const [hbValue, setHbValue] = useState('');

  // ── Emergency flags ──────────────────────────
  const [emergency, setEmergency] = useState({
    fainted: false,
    severePain: false,
    vomiting: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lifestyle quick-inputs for ML
  const [stressLevel, setStressLevel] = useState(0); // 0 = not set
  const [sleepHours, setSleepHours] = useState('');
  const [exerciseFreq, setExerciseFreq] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  // ── Detail / Severity State ──────────────────
  const [painIntensity, setPainIntensity] = useState(0); // 0 = unset, 1-10
  const [bleedingLevel, setBleedingLevel] = useState(''); // Light/Moderate/Heavy/Very Heavy
  const [fatigueLevel, setFatigueLevel] = useState(''); // Mild/Moderate/Severe
  const [symptomDuration, setSymptomDuration] = useState(''); // Today/Few Days/1 Week+/Ongoing

  // Load profile on mount (for ML prediction context)
  React.useEffect(() => {
    (async () => {
      try {
        const p = await getUserProfile();
        if (p) {
          setUserProfile(p);
          // Pre-fill from profile if saved
          if (p.stress_level && stressLevel === 0) setStressLevel(p.stress_level);
          if (p.sleep_hours && !sleepHours) setSleepHours(String(p.sleep_hours));
          if (p.exercise_freq && !exerciseFreq) setExerciseFreq(String(p.exercise_freq));
        }
      } catch (_) {}
    })();
  }, []);

  // Count selected symptoms for progress
  const selectedCount = Object.values(symptoms).filter(Boolean).length +
    Object.values(emergency).filter(Boolean).length;

  // Toggle a symptom flag
  const toggleSymptom = (key) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle an emergency flag
  const toggleEmergency = (key) => {
    setEmergency((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle hemoglobin input — auto-set lowHb flag
  const handleHbChange = (value) => {
    setHbValue(value);
    const hb = parseFloat(value);
    if (!isNaN(hb) && hb > 0) {
      // WHO considers Hb < 11 g/dL as anemia for women
      setSymptoms((prev) => ({ ...prev, lowHb: hb < 11 }));
    }
  };

  // ── Submit Handler ───────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Build lifestyle data for ML engine
      const lifestyle = {};
      if (stressLevel > 0) lifestyle.stress_level = stressLevel;
      if (sleepHours.trim()) lifestyle.sleep_hours = parseFloat(sleepHours);
      if (exerciseFreq.trim()) lifestyle.exercise_freq = parseInt(exerciseFreq, 10);

      // Use enhanced risk assessment (ML API → Local RF → Rule-based)
      const result = await enhancedRiskAssessment({
        symptoms,
        emergency,
        profile: userProfile || {},
        lifestyle,
        language: lang,
      });

      // 2. Get village code for anonymized storage
      const villageCode = await getVillageCode();

      // 3. Store record locally (encrypted + anonymized)
      const record = await saveHealthRecord({
        villageCode: villageCode || 'UNKNOWN',
        symptoms,
        emergency,
        score: result.score,
        level: result.level,
      });

      // 4. Navigate to result screen with assessment data
      router.push({
        pathname: '/result',
        params: {
          score: result.score.toString(),
          level: result.level,
          color: result.color,
          advice: result.advice,
          requiresEmergency: result.requiresEmergency.toString(),
          recordId: record.id,
          // ML enriched params
          mlAvailable: result.mlAvailable ? 'true' : 'false',
          mlConfidence: result.mlConfidence != null ? result.mlConfidence.toString() : '',
          healthScore: result.healthScore != null ? result.healthScore.toString() : '',
          healthGrade: result.healthGrade || '',
          recommendationKey: result.recommendationKey || '',
          source: result.source || '',
          symptomsJson: JSON.stringify(symptoms),
          emergencyJson: JSON.stringify(emergency),
          detailsJson: JSON.stringify({
            painIntensity: painIntensity || null,
            bleedingLevel: bleedingLevel || null,
            fatigueLevel: fatigueLevel || null,
            symptomDuration: symptomDuration || null,
          }),
        },
      });
    } catch (error) {
      console.error('[SymptomScreen] Assessment failed:', error);
      Alert.alert(
        'Error',
        lang === 'hi'
          ? 'मूल्यांकन विफल हुआ। कृपया पुनः प्रयास करें।'
          : 'Assessment failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Section Header Helper ────────────────────
  const SectionHeader = ({ icon, title, step, badge }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconCircle}>
        <Text style={styles.sectionIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{title}</Text>
        {step ? <Text style={styles.sectionStep}>{step}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Custom Back Bar ──────────── */}
      <View style={styles.backBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel} numberOfLines={1}>{texts.title}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header Card ──────────────── */}
          <View style={styles.headerCard}>
            <View style={styles.headerAccent} />
            <View style={styles.headerRow}>
              <View style={styles.headerIconCircle}>
                <Text style={styles.headerIcon}>🩺</Text>
              </View>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{texts.title}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>{texts.subtitle}</Text>
              </View>
            </View>
            {selectedCount > 0 && (
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillText}>
                  {selectedCount} {lang === 'hi' ? 'चयनित' : 'selected'}
                </Text>
              </View>
            )}
          </View>

          {/* ── Symptoms Section ──────────── */}
          <SectionHeader icon="💊" title={texts.symptomsSection} step={texts.stepSymptoms} />

          <View style={styles.sectionCard}>
            <SymptomToggle
              label={texts.heavyBleeding}
              active={symptoms.heavyBleeding}
              onToggle={() => toggleSymptom('heavyBleeding')}
              weight={SYMPTOM_WEIGHTS.heavyBleeding}
            />
            {symptoms.heavyBleeding && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>{texts.bleedingLevelLabel}</Text>
                <View style={styles.chipRow}>
                  {texts.bleedingLevelOpts.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, bleedingLevel === opt && styles.chipActive]}
                      onPress={() => setBleedingLevel(bleedingLevel === opt ? '' : opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, bleedingLevel === opt && styles.chipTextActive]} numberOfLines={1}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <SymptomToggle
              label={texts.fatigue}
              active={symptoms.fatigue}
              onToggle={() => toggleSymptom('fatigue')}
              weight={SYMPTOM_WEIGHTS.fatigue}
            />
            {symptoms.fatigue && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>{texts.fatigueLevelLabel}</Text>
                <View style={styles.chipRow}>
                  {texts.fatigueLevelOpts.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, fatigueLevel === opt && styles.chipActive]}
                      onPress={() => setFatigueLevel(fatigueLevel === opt ? '' : opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, fatigueLevel === opt && styles.chipTextActive]} numberOfLines={1}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <SymptomToggle
              label={texts.dizziness}
              active={symptoms.dizziness}
              onToggle={() => toggleSymptom('dizziness')}
              weight={SYMPTOM_WEIGHTS.dizziness}
            />
            <SymptomToggle
              label={texts.irregularCycles}
              active={symptoms.irregularCycles}
              onToggle={() => toggleSymptom('irregularCycles')}
              weight={SYMPTOM_WEIGHTS.irregularCycles}
            />
            <SymptomToggle
              label={texts.pain}
              active={symptoms.pain}
              onToggle={() => toggleSymptom('pain')}
              weight={SYMPTOM_WEIGHTS.pain}
            />
            {symptoms.pain && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>{texts.painIntensityLabel}</Text>
                <View style={styles.chipRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.chip, styles.chipSmall, painIntensity === val && styles.chipActive]}
                      onPress={() => setPainIntensity(painIntensity === val ? 0 : val)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, painIntensity === val && styles.chipTextActive]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <SymptomToggle
              label={texts.pregnancyIssue}
              active={symptoms.pregnancyIssue}
              onToggle={() => toggleSymptom('pregnancyIssue')}
              weight={SYMPTOM_WEIGHTS.pregnancyIssue}
            />

            {/* ── Symptom Duration ─────────── */}
            <View style={styles.durationSection}>
              <Text style={styles.miniLabel}>{texts.durationLabel}</Text>
              <View style={styles.chipRow}>
                {texts.durationOpts.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, symptomDuration === opt && styles.chipActive]}
                    onPress={() => setSymptomDuration(symptomDuration === opt ? '' : opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, symptomDuration === opt && styles.chipTextActive]} numberOfLines={1}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Hemoglobin Section ────────── */}
          <SectionHeader icon="🩸" title={texts.hbSection} step={texts.stepHb} badge={texts.hbOptional} />

          <View style={styles.sectionCard}>
            <TextInput
              style={styles.hbInput}
              value={hbValue}
              onChangeText={handleHbChange}
              placeholder={texts.hbPlaceholder}
              placeholderTextColor="#BBB"
              keyboardType="decimal-pad"
              maxLength={5}
            />
            <Text style={styles.hbNote}>{texts.hbNote}</Text>
            {symptoms.lowHb && (
              <View style={styles.hbWarningBox}>
                <Text style={styles.hbWarningIcon}>⚠️</Text>
                <Text style={styles.hbWarning}>
                  {lang === 'hi'
                    ? 'कम हीमोग्लोबिन पाया गया'
                    : 'Low hemoglobin detected'}
                </Text>
              </View>
            )}
          </View>

          {/* ── Emergency Section ─────────── */}
          <SectionHeader icon="🚨" title={texts.emergencySection} step={texts.stepEmergency} />

          <View style={[styles.sectionCard, styles.emergencyCard]}>
            <View style={styles.emergencyNoticeRow}>
              <Text style={styles.emergencyNoticeIcon}>⚡</Text>
              <Text style={styles.emergencyNote} numberOfLines={2}>{texts.emergencyNote}</Text>
            </View>

            <SymptomToggle
              label={texts.fainted}
              active={emergency.fainted}
              onToggle={() => toggleEmergency('fainted')}
              weight={EMERGENCY_INTENSITY.fainted}
            />
            <SymptomToggle
              label={texts.severePain}
              active={emergency.severePain}
              onToggle={() => toggleEmergency('severePain')}
              weight={EMERGENCY_INTENSITY.severePain}
            />
            <SymptomToggle
              label={texts.vomiting}
              active={emergency.vomiting}
              onToggle={() => toggleEmergency('vomiting')}
              weight={EMERGENCY_INTENSITY.vomiting}
            />
          </View>

          {/* ── Lifestyle Quick-Input (Optional) ─ */}
          <SectionHeader icon="🏃" title={texts.lifestyleQuick} step={texts.stepLifestyle} badge={texts.lifestyleOptional} />

          <View style={styles.sectionCard}>
            <Text style={styles.lifestyleHintText}>{texts.lifestyleQuickHint}</Text>

            {/* Stress Level Chips */}
            <Text style={styles.miniLabel}>{texts.stressLabel}</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chip, stressLevel === val && styles.chipActive]}
                  onPress={() => setStressLevel(stressLevel === val ? 0 : val)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, stressLevel === val && styles.chipTextActive]} numberOfLines={1}>
                    {texts.stressOpts[val - 1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sleep & Exercise inline */}
            <View style={styles.inlineRow}>
              <View style={styles.inlineField}>
                <Text style={styles.miniLabel}>{texts.sleepLabel}</Text>
                <TextInput
                  style={styles.miniInput}
                  value={sleepHours}
                  onChangeText={(v) => setSleepHours(v.replace(/[^0-9.]/g, ''))}
                  placeholder={texts.sleepPlaceholder}
                  placeholderTextColor="#BBB"
                  keyboardType="decimal-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.miniLabel}>{texts.exerciseLabel}</Text>
                <TextInput
                  style={styles.miniInput}
                  value={exerciseFreq}
                  onChangeText={(v) => setExerciseFreq(v.replace(/[^0-9]/g, ''))}
                  placeholder={texts.exercisePlaceholder}
                  placeholderTextColor="#BBB"
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
            </View>
          </View>

          {/* ── Submit Button ─────────────── */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.submitBtnIcon}>{isSubmitting ? '⏳' : '🔍'}</Text>
            <Text style={styles.submitBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {isSubmitting ? texts.assessing : texts.submitBtn}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FCE4EC',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 12,
  },
  backArrow: {
    fontSize: 22,
    color: '#C2185B',
    fontWeight: '600',
  },
  backLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1,
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },

  /* ── Header Card ── */
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 22,
    overflow: 'hidden',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E91E63',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
    flexShrink: 1,
  },
  selectedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FCE4EC',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  selectedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E91E63',
  },

  /* ── Section Headers ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    marginTop: 6,
  },
  sectionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#444',
    flexShrink: 1,
  },
  sectionStep: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C2185B',
    marginTop: 1,
  },
  sectionBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Section Card ── */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emergencyCard: {
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFAFA',
  },

  /* ── Hemoglobin ── */
  hbInput: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  hbNote: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 8,
    marginLeft: 4,
    lineHeight: 17,
  },
  hbWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  hbWarningIcon: {
    fontSize: 16,
  },
  hbWarning: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
  },

  /* ── Emergency ── */
  emergencyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  emergencyNoticeIcon: {
    fontSize: 16,
  },
  emergencyNote: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },

  /* ── Lifestyle ── */
  lifestyleHintText: {
    fontSize: 12,
    color: '#BBB',
    marginBottom: 10,
    fontStyle: 'italic',
  },

  /* ── Shared ── */
  miniLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 8,
  },
  durationSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    backgroundColor: '#FAFAFA',
  },
  chipActive: {
    borderColor: '#F48FB1',
    backgroundColor: '#FCE4EC',
  },
  chipText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#C2185B',
    fontWeight: '700',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  inlineField: {
    flex: 1,
  },
  miniInput: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#333',
  },
  submitBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnIcon: {
    fontSize: 18,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  detailContainer: {
    marginLeft: 12,
    marginBottom: 6,
    paddingLeft: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F48FB1',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C2185B',
    marginTop: 4,
    marginBottom: 6,
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 34,
    alignItems: 'center',
  },
});
