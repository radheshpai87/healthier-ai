/**
 * SymptomToggle.js
 * ─────────────────────────────────────────────
 * Toggle button component for symptom selection.
 * Shows a tappable card that toggles between
 * active (pink) and inactive (grey) states.
 *
 * Accessible for rural users — large touch target
 * with clear visual feedback and checkbox indicator.
 * ─────────────────────────────────────────────
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

/**
 * @param {Object} props
 * @param {string} props.label       - Display text
 * @param {boolean} props.active     - Whether this symptom is toggled on
 * @param {function} props.onToggle  - Callback when pressed
 * @param {number} [props.weight]    - Optional weight indicator
 */
export default function SymptomToggle({ label, active, onToggle, weight }) {
  return (
    <TouchableOpacity
      style={[styles.container, active && styles.activeContainer]}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
    >
      {/* Checkbox circle */}
      <View style={[styles.checkbox, active && styles.checkboxActive]}>
        {active && <Text style={styles.checkmark}>✓</Text>}
      </View>

      <Text
        style={[styles.label, active && styles.activeLabel]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>

      {weight !== undefined && (
        <View style={[styles.weightBadge, active && styles.weightBadgeActive]}>
          <Text style={[styles.weight, active && styles.activeWeight]}>
            +{weight}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EEEEEE',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 5,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activeContainer: {
    backgroundColor: '#FFF0F3',
    borderColor: '#F48FB1',
    shadowColor: '#E91E63',
    shadowOpacity: 0.08,
    elevation: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#F9F9F9',
  },
  checkboxActive: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -1,
  },
  label: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  activeLabel: {
    color: '#C2185B',
    fontWeight: '600',
  },
  weightBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  weightBadgeActive: {
    backgroundColor: '#FCE4EC',
  },
  weight: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '700',
  },
  activeWeight: {
    color: '#E91E63',
  },
});
