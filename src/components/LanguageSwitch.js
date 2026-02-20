import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Languages } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitch() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <TouchableOpacity style={styles.container} onPress={toggleLanguage}>
      <Languages size={20} color="#FFB6C1" />
      <Text style={styles.text}>
        {language === 'en' ? 'EN' : 'HI'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
