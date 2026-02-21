/**
 * ResultScreen.js
 * ─────────────────────────────────────────────
 * Displays risk assessment results after symptom
 * submission.
 *
 * Shows:
 *   - Risk badge (color-coded level) with score circle
 *   - Advice card (localized)
 *   - ML stats cards
 *   - AI personalised advice
 *   - Emergency actions (if HIGH risk)
 *   - Navigation buttons
 *
 * If requiresEmergency === true:
 *   - Automatically triggers SMS + call prompt
 * ─────────────────────────────────────────────
 */

import React, { useContext, useEffect, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LanguageContext } from '../context/LanguageContext';
import RiskBadge from '../components/RiskBadge';
import { triggerEmergency, sendEmergencySMS, promptEmergencyCall } from '../services/emergencyService';
import { RISK_LEVELS, HEALTH_GRADE_COLORS } from '../utils/constants';
import { translations } from '../constants/translations';
import { generateSymptomAdvice } from '../api/gemini';
import { saveLastRiskResult } from '../services/storageService';

// ── Translations ───────────────────────────────
const t = {
  en: {
    title: 'Assessment Result',
    adviceTitle: 'Recommendation',
    emergencyTitle: 'Emergency Actions',
    emergencyDesc: 'Your symptoms indicate a serious health concern. Please take immediate action.',
    sendSMS: 'Send Emergency SMS',
    smsSent: 'SMS Sent',
    smsFailed: 'SMS Failed',
    call112: 'Call 112 (Emergency)',
    newAssessment: 'New Assessment',
    goHome: 'Go to Home',
    shareWithASHA: 'Share with ASHA Worker',
    emergencyTriggered: 'Emergency alert has been sent to your configured contacts.',
  },
  hi: {
    title: 'मूल्यांकन परिणाम',
    adviceTitle: 'सिफारिश',
    emergencyTitle: 'आपातकालीन कार्रवाई',
    emergencyDesc: 'आपके लक्षण गंभीर स्वास्थ्य चिंता का संकेत देते हैं। कृपया तत्काल कार्रवाई करें।',
    sendSMS: 'आपातकालीन SMS भेजें',
    smsSent: 'SMS भेजा गया',
    smsFailed: 'SMS विफल',
    call112: '112 पर कॉल करें (आपातकालीन)',
    newAssessment: 'नया मूल्यांकन',
    goHome: 'होम पेज पर जाएं',
    shareWithASHA: 'आशा कार्यकर्ता के साथ साझा करें',
    emergencyTriggered: 'आपके कॉन्फ़िगर किए गए संपर्कों को आपातकालीन अलर्ट भेजा गया है।',
  },
};

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { language } = useContext(LanguageContext);
  const lang = language === 'hi' ? 'hi' : 'en';
  const texts = t[lang];

  // Parse params
  const score = parseInt(params.score || '0', 10);
  const level = params.level || RISK_LEVELS.LOW;
  const color = params.color || '#4CAF50';
  const advice = params.advice || '';
  const requiresEmergency = params.requiresEmergency === 'true';

  // ML-enriched params
  const mlAvailable = params.mlAvailable === 'true';
  const mlConfidence = params.mlConfidence ? parseFloat(params.mlConfidence) : null;
  const healthScore = params.healthScore ? parseInt(params.healthScore, 10) : null;
  const healthGrade = params.healthGrade || null;
  const recommendationKey = params.recommendationKey || null;
  const source = params.source || 'rule_based';
  const tGlobal = translations[lang] || translations.en;

  const symptoms = (() => { try { return JSON.parse(params.symptomsJson || '{}'); } catch { return {}; } })();
  const emergency = (() => { try { return JSON.parse(params.emergencyJson || '{}'); } catch { return {}; } })();
  const details = (() => { try { return JSON.parse(params.detailsJson || '{}'); } catch { return {}; } })();

  const [smsStatus, setSmsStatus] = useState(null);
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  // ── Auto-trigger emergency if HIGH risk ──────
  useEffect(() => {
    if (requiresEmergency) {
      const timer = setTimeout(() => {
        handleEmergencyTrigger();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch AI advice grounded in the ML risk output
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await saveLastRiskResult({ level, score, mlConfidence, healthGrade, recommendationKey, source, symptoms, emergency, details });
        const text = await generateSymptomAdvice(
          { level, score, mlConfidence, healthGrade, symptoms, emergency, details },
          lang
        );
        if (!cancelled) setAiAdvice(text);
      } catch (e) {
        console.warn('[ResultScreen] AI advice failed:', e);
        if (!cancelled) setAiAdvice(null);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleEmergencyTrigger = async () => {
    try {
      const result = await triggerEmergency(score, lang);
      setSmsStatus(result.smsResult.sent ? 'sent' : 'failed');
    } catch (error) {
      console.error('[ResultScreen] Emergency trigger failed:', error);
      setSmsStatus('failed');
    }
  };

  const handleSendSMS = async () => {
    try {
      const result = await sendEmergencySMS(score, lang);
      setSmsStatus(result.sent ? 'sent' : 'failed');
      Alert.alert('', result.message);
    } catch (error) {
      setSmsStatus('failed');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Custom Top Bar ─────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.topBarArrow}>←</Text>
          <Text style={styles.topBarLabel} numberOfLines={1}>{texts.title}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header Card ──────────────── */}
        <View style={styles.headerCard}>
          <View style={[styles.headerAccent, { backgroundColor: color }]} />
          <View style={styles.headerRow}>
            <View style={[styles.headerDot, { backgroundColor: color + '22' }]}>
              <Text style={styles.headerIcon}>📋</Text>
            </View>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{texts.title}</Text>
              <Text style={styles.headerSource} numberOfLines={1}>
                {source === 'ml_api'
                  ? (lang === 'hi' ? 'ML-संचालित विश्लेषण' : 'ML-Powered Analysis')
                  : (lang === 'hi' ? 'ऑफ़लाइन विश्लेषण' : 'Offline Analysis')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Risk Badge ───────────────── */}
        <View style={styles.badgeContainer}>
          <RiskBadge level={level} score={score} large />
        </View>

        {/* ── Advice Card ──────────────── */}
        <View style={styles.adviceCard}>
          <View style={[styles.adviceAccent, { backgroundColor: color }]} />
          <View style={styles.adviceHeader}>
            <Text style={styles.adviceIcon}>💡</Text>
            <Text style={styles.adviceTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{texts.adviceTitle}</Text>
          </View>
          <Text style={styles.adviceText}>{advice}</Text>
        </View>

        {/* ── ML Recommendation (if available) ─ */}
        {recommendationKey && tGlobal[recommendationKey] && (
          <View style={styles.mlRecommendationCard}>
            <View style={styles.mlRecommendationHeader}>
              <Text style={styles.mlRecommendationIcon}>🤖</Text>
              <Text style={styles.mlRecommendationLabel} numberOfLines={1}>
                {lang === 'hi' ? 'ML अनुशंसा' : 'ML Recommendation'}
              </Text>
            </View>
            <Text style={styles.mlRecommendationText}>
              {tGlobal[recommendationKey]}
            </Text>
          </View>
        )}

        {/* ── Health Score & Confidence (ML enriched) ─ */}
        {(healthScore != null || mlConfidence != null) && (
          <View style={styles.mlCard}>
            <View style={styles.mlBadge}>
              <Text style={styles.mlBadgeText}>
                {source === 'ml_api' ? (tGlobal.mlPowered || 'ML-Powered') : (tGlobal.offlineMode || 'Offline Analysis')}
              </Text>
            </View>
            <View style={styles.mlRow}>
              {healthScore != null && (
                <View style={styles.mlStat}>
                  <View style={[styles.mlStatCircle, { borderColor: HEALTH_GRADE_COLORS[healthGrade] || '#E0E0E0' }]}>
                    <Text style={[styles.mlStatValue, { color: HEALTH_GRADE_COLORS[healthGrade] || '#333' }]}>
                      {healthScore}
                    </Text>
                  </View>
                  <Text style={styles.mlStatLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {tGlobal.healthScoreLabel || 'Health Score'}
                  </Text>
                </View>
              )}
              {healthGrade && (
                <View style={styles.mlStat}>
                  <View style={[styles.mlStatCircle, { borderColor: HEALTH_GRADE_COLORS[healthGrade] || '#E0E0E0' }]}>
                    <Text style={[styles.mlStatValue, { color: HEALTH_GRADE_COLORS[healthGrade] || '#333' }]}>
                      {healthGrade}
                    </Text>
                  </View>
                  <Text style={styles.mlStatLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {tGlobal.healthGrade || 'Grade'}
                  </Text>
                </View>
              )}
              {mlConfidence != null && (
                <View style={styles.mlStat}>
                  <View style={[styles.mlStatCircle, { borderColor: '#6366F1' }]}>
                    <Text style={[styles.mlStatValue, { color: '#6366F1' }]}>
                      {Math.round(mlConfidence * 100)}%
                    </Text>
                  </View>
                  <Text style={styles.mlStatLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {tGlobal.confidenceLabel || 'Confidence'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── AI Symptom Advice ────────── */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiDot}>
              <Text style={styles.aiDotIcon}>✨</Text>
            </View>
            <Text style={styles.aiCardLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {lang === 'hi' ? 'AI स्वास्थ्य सलाह' : 'AI Health Advice'}
            </Text>
          </View>
          {aiLoading ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator size="small" color="#C2185B" />
              <Text style={styles.aiLoadingText}>
                {lang === 'hi' ? 'सलाह तैयार हो रही है...' : 'Generating personalised advice...'}
              </Text>
            </View>
          ) : aiAdvice ? (
            <Text style={styles.aiAdviceText}>{aiAdvice}</Text>
          ) : null}
        </View>

        {/* ── Emergency Actions (only for HIGH risk) ─ */}
        {requiresEmergency && (
          <View style={styles.emergencyContainer}>
            <View style={styles.emergencyHeader}>
              <Text style={styles.emergencyIcon}>🚨</Text>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={styles.emergencyTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{texts.emergencyTitle}</Text>
                <Text style={styles.emergencyDesc} numberOfLines={3}>{texts.emergencyDesc}</Text>
              </View>
            </View>

            {/* Send SMS Button */}
            <TouchableOpacity
              style={[
                styles.emergencyBtn,
                smsStatus === 'sent' && styles.emergencyBtnSent,
              ]}
              onPress={handleSendSMS}
              activeOpacity={0.7}
              disabled={smsStatus === 'sent'}
            >
              <Text style={styles.emergencyBtnIcon}>{smsStatus === 'sent' ? '✅' : '📤'}</Text>
              <Text style={styles.emergencyBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {smsStatus === 'sent'
                  ? texts.smsSent
                  : smsStatus === 'failed'
                  ? texts.smsFailed
                  : texts.sendSMS}
              </Text>
            </TouchableOpacity>

            {/* Call 112 Button */}
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => promptEmergencyCall(lang)}
              activeOpacity={0.7}
            >
              <Text style={styles.callBtnIcon}>📞</Text>
              <Text style={styles.callBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{texts.call112}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Navigation Buttons ─────── */}
        <View style={styles.navBtns}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.push('/symptoms')}
            activeOpacity={0.7}
          >
            <Text style={styles.navBtnIcon}>🔄</Text>
            <Text style={styles.navBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{texts.newAssessment}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnSecondary]}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Text style={styles.navBtnIcon}>🏠</Text>
            <Text style={[styles.navBtnText, styles.navBtnTextSecondary]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {texts.goHome}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FCE4EC',
  },
  topBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 12,
  },
  topBarArrow: {
    fontSize: 22,
    color: '#C2185B',
    fontWeight: '600',
  },
  topBarLabel: {
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
    padding: 18,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  headerDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  headerSource: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },

  /* ── Badge ── */
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 22,
  },

  /* ── Advice Card ── */
  adviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  adviceAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginLeft: 8,
  },
  adviceIcon: {
    fontSize: 16,
  },
  adviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555',
    flexShrink: 1,
  },
  adviceText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    marginLeft: 8,
  },

  /* ── ML Recommendation ── */
  mlRecommendationCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  mlRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mlRecommendationIcon: {
    fontSize: 16,
  },
  mlRecommendationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  mlRecommendationText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },

  /* ── ML Stats Card ── */
  mlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  mlBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  mlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mlStat: {
    alignItems: 'center',
    flex: 1,
  },
  mlStatCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  mlStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  mlStatLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
  },

  /* ── Emergency ── */
  emergencyContainer: {
    backgroundColor: '#FFFAFA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#EF5350',
    marginBottom: 20,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  emergencyIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D32F2F',
    flexShrink: 1,
  },
  emergencyDesc: {
    fontSize: 13,
    color: '#E53935',
    lineHeight: 19,
    marginTop: 4,
    flexShrink: 1,
  },
  emergencyBtn: {
    backgroundColor: '#EF5350',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
  },
  emergencyBtnSent: {
    backgroundColor: '#43A047',
  },
  emergencyBtnIcon: {
    fontSize: 16,
  },
  emergencyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  callBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnIcon: {
    fontSize: 16,
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },

  /* ── Navigation Buttons ── */
  navBtns: {
    gap: 12,
  },
  navBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  navBtnIcon: {
    fontSize: 16,
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  navBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E91E63',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    elevation: 1,
  },
  navBtnTextSecondary: {
    color: '#E91E63',
  },

  /* ── AI Card ── */
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#F8BBD0',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  aiDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiDotIcon: {
    fontSize: 14,
  },
  aiCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2185B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  aiLoadingText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    flexShrink: 1,
  },
  aiAdviceText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
});
