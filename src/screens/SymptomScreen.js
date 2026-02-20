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
    hbSection: 'Hemoglobin Level (optional)',
    hbPlaceholder: 'Enter Hb value (e.g., 10.5)',
    hbNote: 'If Hb < 11 g/dL, it indicates anemia',
    emergencySection: 'Emergency Signs',
    emergencyNote: 'Select if experiencing right now',
    fainted: 'Fainted / Lost Consciousness',
    severePain: 'Severe Unbearable Pain',
    vomiting: 'Continuous Vomiting',
    submitBtn: 'Check Risk Level',
    assessing: 'Assessing...',
    // Lifestyle quick-input
    lifestyleQuick: 'Lifestyle Factors (Optional)',
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
    hbSection: 'हीमोग्लोबिन स्तर (वैकल्पिक)',
    hbPlaceholder: 'Hb मान दर्ज करें (जैसे 10.5)',
    hbNote: 'यदि Hb < 11 g/dL है, तो यह एनीमिया का संकेत है',
    emergencySection: 'आपातकालीन संकेत',
    emergencyNote: 'अभी अनुभव हो रहा हो तो चुनें',
    fainted: 'बेहोशी / चेतना खोई',
    severePain: 'तीव्र असहनीय दर्द',
    vomiting: 'लगातार उल्टी',
    submitBtn: 'जोखिम स्तर जांचें',
    assessing: 'जांच हो रही है...',
    lifestyleQuick: 'जीवनशैली कारक (वैकल्पिक)',
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.title}>{texts.title}</Text>
          <Text style={styles.subtitle}>{texts.subtitle}</Text>

          {/* ── Symptoms Section ──────────── */}
          <Text style={styles.sectionTitle}>{texts.symptomsSection}</Text>

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
                    <Text style={[styles.chipText, bleedingLevel === opt && styles.chipTextActive]}>
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
                    <Text style={[styles.chipText, fatigueLevel === opt && styles.chipTextActive]}>
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
          <Text style={[styles.miniLabel, { marginTop: 16 }]}>{texts.durationLabel}</Text>
          <View style={styles.chipRow}>
            {texts.durationOpts.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, symptomDuration === opt && styles.chipActive]}
                onPress={() => setSymptomDuration(symptomDuration === opt ? '' : opt)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, symptomDuration === opt && styles.chipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Hemoglobin Section ────────── */}
          <Text style={styles.sectionTitle}>{texts.hbSection}</Text>
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
            <Text style={styles.hbWarning}>
              {lang === 'hi'
                ? 'कम हीमोग्लोबिन पाया गया'
                : 'Low hemoglobin detected'}
            </Text>
          )}

          {/* ── Emergency Section ─────────── */}
          <Text style={styles.sectionTitle}>{texts.emergencySection}</Text>
          <Text style={styles.emergencyNote}>{texts.emergencyNote}</Text>

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

          {/* ── Lifestyle Quick-Input (Optional) ─ */}
          <Text style={styles.sectionTitle}>{texts.lifestyleQuick}</Text>
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
                <Text style={[styles.chipText, stressLevel === val && styles.chipTextActive]}>
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

          {/* ── Submit Button ─────────────── */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.submitBtnText}>
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
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
    marginTop: 24,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E9',
    paddingBottom: 8,
  },
  hbInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  hbNote: {
    fontSize: 13,
    color: '#AAA',
    marginTop: 6,
    marginLeft: 4,
  },
  hbWarning: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  emergencyNote: {
    fontSize: 13,
    color: '#F44336',
    fontStyle: 'italic',
    marginBottom: 8,
    marginLeft: 4,
  },
  lifestyleHintText: {
    fontSize: 12,
    color: '#BBB',
    marginBottom: 8,
    marginLeft: 4,
  },
  miniLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  chipActive: {
    borderColor: '#FFB6C1',
    backgroundColor: '#FFE4E9',
  },
  chipText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#C2185B',
    fontWeight: '600',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  inlineField: {
    flex: 1,
  },
  miniInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#333',
  },
  submitBtn: {
    backgroundColor: '#FFB6C1',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailContainer: {
    marginLeft: 8,
    marginBottom: 4,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#FFB6C1',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C2185B',
    marginTop: 4,
    marginBottom: 4,
  },
  chipSmall: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 32,
    alignItems: 'center',
  },
});
