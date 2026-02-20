/**
 * ResultScreen.js
 * ─────────────────────────────────────────────
 * Displays risk assessment results after symptom
 * submission.
 *
 * Shows:
 *   - Risk badge (color-coded level)
 *   - Advice text (localized)
 *   - Emergency actions (if HIGH risk)
 *   - Option to go back or go home
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LanguageContext } from '../context/LanguageContext';
import RiskBadge from '../components/RiskBadge';
import { triggerEmergency, sendEmergencySMS, promptEmergencyCall } from '../services/emergencyService';
import { RISK_LEVELS } from '../utils/constants';

// ── Translations ───────────────────────────────
const t = {
  en: {
    title: 'Assessment Result',
    adviceTitle: 'Recommendation',
    emergencyTitle: '🚨 Emergency Actions',
    emergencyDesc: 'Your symptoms indicate a serious health concern. Please take immediate action.',
    sendSMS: '📱 Send Emergency SMS',
    smsSent: '✅ SMS Sent',
    smsFailed: '❌ SMS Failed',
    call112: '📞 Call 112 (Emergency)',
    newAssessment: 'New Assessment',
    goHome: 'Go to Home',
    shareWithASHA: 'Share with ASHA Worker',
    emergencyTriggered: 'Emergency alert has been sent to your configured contacts.',
  },
  hi: {
    title: 'मूल्यांकन परिणाम',
    adviceTitle: 'सिफारिश',
    emergencyTitle: '🚨 आपातकालीन कार्रवाई',
    emergencyDesc: 'आपके लक्षण गंभीर स्वास्थ्य चिंता का संकेत देते हैं। कृपया तत्काल कार्रवाई करें।',
    sendSMS: '📱 आपातकालीन SMS भेजें',
    smsSent: '✅ SMS भेजा गया',
    smsFailed: '❌ SMS विफल',
    call112: '📞 112 पर कॉल करें (आपातकालीन)',
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

  const [smsStatus, setSmsStatus] = useState(null); // null | 'sent' | 'failed'

  // ── Auto-trigger emergency if HIGH risk ──────
  useEffect(() => {
    if (requiresEmergency) {
      // Small delay so the screen renders first
      const timer = setTimeout(() => {
        handleEmergencyTrigger();
      }, 1000);
      return () => clearTimeout(timer);
    }
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
      <ScrollView contentContainerStyle={styles.container}>
        {/* Title */}
        <Text style={styles.title}>{texts.title}</Text>

        {/* Risk Badge */}
        <View style={styles.badgeContainer}>
          <RiskBadge level={level} score={score} large />
        </View>

        {/* Advice Card */}
        <View style={[styles.adviceCard, { borderLeftColor: color }]}>
          <Text style={styles.adviceTitle}>{texts.adviceTitle}</Text>
          <Text style={styles.adviceText}>{advice}</Text>
        </View>

        {/* Emergency Actions (only for HIGH risk) */}
        {requiresEmergency && (
          <View style={styles.emergencyContainer}>
            <Text style={styles.emergencyTitle}>{texts.emergencyTitle}</Text>
            <Text style={styles.emergencyDesc}>{texts.emergencyDesc}</Text>

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
              <Text style={styles.emergencyBtnText}>
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
              <Text style={styles.callBtnText}>{texts.call112}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navBtns}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.push('/symptoms')}
            activeOpacity={0.7}
          >
            <Text style={styles.navBtnText}>{texts.newAssessment}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnSecondary]}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, styles.navBtnTextSecondary]}>
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
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  adviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderLeftWidth: 5,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  emergencyContainer: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    padding: 20,
    borderWidth: 2,
    borderColor: '#F44336',
    marginBottom: 24,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 8,
  },
  emergencyDesc: {
    fontSize: 14,
    color: '#D32F2F',
    lineHeight: 20,
    marginBottom: 16,
  },
  emergencyBtn: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  emergencyBtnSent: {
    backgroundColor: '#4CAF50',
  },
  emergencyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  callBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navBtns: {
    gap: 12,
  },
  navBtn: {
    backgroundColor: '#FFB6C1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFB6C1',
  },
  navBtnTextSecondary: {
    color: '#FFB6C1',
  },
});
