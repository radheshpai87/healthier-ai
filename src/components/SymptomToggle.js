/**
 * SymptomToggle.js
 * ─────────────────────────────────────────────
 * Toggle button component for symptom selection.
 * Shows a tappable pill that toggles between
 * active (pink) and inactive (grey) states.
 *
 * Accessible for rural users — large touch target
 * with clear visual feedback.
 * ─────────────────────────────────────────────
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

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
      <Text style={[styles.label, active && styles.activeLabel]}>
        {label}
      </Text>
      {weight !== undefined && (
        <Text style={[styles.weight, active && styles.activeWeight]}>
          +{weight}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginVertical: 5,
    minHeight: 52, // Large touch target for rural accessibility
  },
  activeContainer: {
    backgroundColor: '#FFE4E9',
    borderColor: '#FFB6C1',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  activeLabel: {
    color: '#D32F6A',
    fontWeight: '600',
  },
  weight: {
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
    fontWeight: '600',
  },
  activeWeight: {
    color: '#D32F6A',
  },
});
