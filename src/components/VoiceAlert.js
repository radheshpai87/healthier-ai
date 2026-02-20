import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { AlertTriangle, Volume2, VolumeX, X } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../constants/translations';

/**
 * VoiceAlert Component
 * 
 * Displays a high-visibility alert banner for health risk warnings
 * with automatic voice announcement support.
 * 
 * Props:
 * - visible: Boolean to show/hide the alert
 * - riskLevel: 'Low' | 'Medium' | 'High'
 * - recommendationKey: Translation key for the recommendation
 * - onDismiss: Callback when user dismisses the alert
 * - autoSpeak: Whether to automatically speak the alert (default: true for High risk)
 */
export default function VoiceAlert({
  visible,
  riskLevel,
  recommendationKey,
  onDismiss,
  autoSpeak = true,
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const translateY = useRef(new Animated.Value(-100)).current;
  const isSpeaking = useRef(false);

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Auto-speak for high risk
      if (autoSpeak && riskLevel === 'High' && !isSpeaking.current) {
        speakAlert();
      }
    } else {
      // Slide out animation
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, riskLevel]);

  const speakAlert = async () => {
    try {
      await Speech.stop();
      isSpeaking.current = true;

      const alertText = getAlertText();
      await Speech.speak(alertText, {
        language: language === 'hi' ? 'hi-IN' : 'en-US',
        rate: 0.85,
        pitch: 1.0,
        onDone: () => {
          isSpeaking.current = false;
        },
        onError: () => {
          isSpeaking.current = false;
        },
      });
    } catch (error) {
      console.error('Voice alert error:', error);
      isSpeaking.current = false;
    }
  };

  const stopSpeaking = async () => {
    try {
      await Speech.stop();
      isSpeaking.current = false;
    } catch (error) {
      console.error('Stop speaking error:', error);
    }
  };

  const getAlertText = () => {
    const riskText = riskLevel === 'High' 
      ? t.highRiskAlert 
      : riskLevel === 'Medium' 
        ? t.mediumRiskAlert 
        : t.lowRiskAlert;
    
    const recommendation = t[recommendationKey] || recommendationKey;
    
    return `${riskText}. ${recommendation}`;
  };

  const getRiskStyles = () => {
    switch (riskLevel) {
      case 'High':
        return {
          backgroundColor: '#FF5722',
          borderColor: '#D84315',
        };
      case 'Medium':
        return {
          backgroundColor: '#FFC107',
          borderColor: '#FFA000',
        };
      case 'Low':
        return {
          backgroundColor: '#4CAF50',
          borderColor: '#388E3C',
        };
      default:
        return {
          backgroundColor: '#9E9E9E',
          borderColor: '#757575',
        };
    }
  };

  const getRiskLabel = () => {
    switch (riskLevel) {
      case 'High': return t.highRisk;
      case 'Medium': return t.mediumRisk;
      case 'Low': return t.lowRisk;
      default: return t.unknownRisk;
    }
  };

  if (!visible) return null;

  const riskStyles = getRiskStyles();

  return (
    <Animated.View 
      style={[
        styles.container, 
        riskStyles,
        { transform: [{ translateY }] }
      ]}
    >
      <View style={styles.header}>
        <AlertTriangle size={24} color="#FFF" />
        <Text style={styles.title}>{getRiskLabel()}</Text>
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={speakAlert}
            accessibilityLabel={t.speakAlert}
          >
            <Volume2 size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={stopSpeaking}
            accessibilityLabel={t.stopAlert}
          >
            <VolumeX size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={onDismiss}
            accessibilityLabel={t.dismiss}
          >
            <X size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.recommendation}>
        {t[recommendationKey] || recommendationKey}
      </Text>
      
      {riskLevel === 'High' && (
        <Text style={styles.urgentNote}>
          {t.urgentCareNote}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 15,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: 3,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 5,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  recommendation: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
    marginBottom: 5,
  },
  urgentNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    marginTop: 5,
  },
});
