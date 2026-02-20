/**
 * RiskBadge.js
 * ─────────────────────────────────────────────
 * Visual badge showing risk level (LOW / MODERATE / HIGH).
 * Color-coded with large, clear text for accessibility.
 * ─────────────────────────────────────────────
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RISK_COLORS, RISK_LEVELS } from '../utils/constants';

/**
 * @param {Object} props
 * @param {string} props.level    - 'LOW' | 'MODERATE' | 'HIGH'
 * @param {number} props.score    - Numeric risk score
 * @param {boolean} [props.large] - Whether to show large variant
 */
export default function RiskBadge({ level, score, large = false }) {
  const color = RISK_COLORS[level] || '#999';

  // Icons for each level
  const icons = {
    [RISK_LEVELS.LOW]: '✅',
    [RISK_LEVELS.MODERATE]: '⚠️',
    [RISK_LEVELS.HIGH]: '🚨',
  };

  const levelLabels = {
    [RISK_LEVELS.LOW]: 'Low Risk',
    [RISK_LEVELS.MODERATE]: 'Moderate Risk',
    [RISK_LEVELS.HIGH]: 'High Risk',
  };

  return (
    <View
      style={[
        styles.container,
        { borderColor: color },
        large && styles.largeContainer,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Risk level: ${levelLabels[level]}, Score: ${score}`}
    >
      <Text style={[styles.icon, large && styles.largeIcon]}>
        {icons[level] || '❓'}
      </Text>
      <Text style={[styles.level, { color }, large && styles.largeLevel]}>
        {levelLabels[level] || level}
      </Text>
      <Text style={[styles.score, large && styles.largeScore]}>
        Score: {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  largeContainer: {
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: 20,
    borderWidth: 3,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  largeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  level: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  largeLevel: {
    fontSize: 24,
  },
  score: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  largeScore: {
    fontSize: 18,
    marginTop: 8,
  },
});
