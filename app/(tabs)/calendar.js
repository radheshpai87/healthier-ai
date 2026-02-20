import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CycleCalendar from '../../src/components/Calendar';
import LanguageSwitch from '../../src/components/LanguageSwitch';
import { useLanguage } from '../../src/context/LanguageContext';

export default function CalendarScreen() {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.calendar}</Text>
        <LanguageSwitch />
      </View>
      <CycleCalendar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50 },
  title:     { fontSize: 22, fontWeight: 'bold', color: '#C2185B' },
});
