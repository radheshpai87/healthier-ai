/**
 * RiskBadge.js
 * ─────────────────────────────────────────────
 * Visual badge showing risk level (LOW / MODERATE / HIGH).
 * Color-coded with large, clear text for accessibility.
 * Features a circular score ring and level indicator.
 * ─────────────────────────────────────────────
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RISK_COLORS, RISK_LEVELS } from '../utils/constants';

const LEVEL_EMOJI = {
  [RISK_LEVELS.LOW]: '🟢',
  [RISK_LEVELS.MODERATE]: '🟡',
  [RISK_LEVELS.HIGH]: '🔴',
};

/**
 * @param {Object} props
 * @param {string} props.level    - 'LOW' | 'MODERATE' | 'HIGH'
 * @param {number} props.score    - Numeric risk score
 * @param {boolean} [props.large] - Whether to show large variant
 */
export default function RiskBadge({ level, score, large = false }) {
  const color = RISK_COLORS[level] || '#999';
  const emoji = LEVEL_EMOJI[level] || '⚪';

  const levelLabels = {
    [RISK_LEVELS.LOW]: 'Low Risk',
    [RISK_LEVELS.MODERATE]: 'Moderate Risk',
    [RISK_LEVELS.HIGH]: 'High Risk',
  };

  // Progress percentage for the score ring visual (max score ~20)
  const maxScore = 20;
  const pct = Math.min(score / maxScore, 1);

  if (large) {
    return (
      <View
        style={styles.largeWrapper}
        accessibilityRole="text"
        accessibilityLabel={`Risk level: ${levelLabels[level]}, Score: ${score}`}
      >
        {/* Score circle */}
        <View style={[styles.scoreCircle, { borderColor: color }]}>
          <Text style={[styles.scoreNum, { color }]}>{score}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>

        {/* Level pill */}
        <View style={[styles.levelPill, { backgroundColor: color + '18', borderColor: color }]}>
          <Text style={styles.levelEmoji}>{emoji}</Text>
          <Text style={[styles.levelText, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {levelLabels[level] || level}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { borderColor: color }]}
      accessibilityRole="text"
      accessibilityLabel={`Risk level: ${levelLabels[level]}, Score: ${score}`}
    >
      <Text style={styles.smallEmoji}>{emoji}</Text>
      <Text style={[styles.level, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {levelLabels[level] || level}
      </Text>
      <Text style={styles.scoreSmall}>
        Score: {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Small variant ── */
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  smallEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  level: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreSmall: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  /* ── Large variant ── */
  largeWrapper: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  scoreNum: {
    fontSize: 36,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: -2,
    fontWeight: '600',
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  levelEmoji: {
    fontSize: 16,
  },
  levelText: {
    fontSize: 17,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  progressTrack: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});
