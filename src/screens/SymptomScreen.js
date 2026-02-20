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
import { calculateRisk } from '../services/riskEngine';
import { saveHealthRecord, getVillageCode } from '../services/storageService';
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
      // 1. Calculate risk using rule-based engine
      const result = calculateRisk(symptoms, emergency, lang);

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
          <SymptomToggle
            label={texts.fatigue}
            active={symptoms.fatigue}
            onToggle={() => toggleSymptom('fatigue')}
            weight={SYMPTOM_WEIGHTS.fatigue}
          />
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
          <SymptomToggle
            label={texts.pregnancyIssue}
            active={symptoms.pregnancyIssue}
            onToggle={() => toggleSymptom('pregnancyIssue')}
            weight={SYMPTOM_WEIGHTS.pregnancyIssue}
          />

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
                ? '⚠️ कम हीमोग्लोबिन पाया गया'
                : '⚠️ Low hemoglobin detected'}
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
});
