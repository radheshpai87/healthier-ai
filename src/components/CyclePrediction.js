import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CalendarClock, AlertCircle } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../constants/translations';
import { useCycleTracker } from '../hooks/useCycleTracker';

export default function CyclePrediction() {
  const { language } = useLanguage();
  const t = translations[language];
  const { nextPeriodDate, daysUntilNextPeriod, cycleLength, isLoading } = useCycleTracker();

  if (isLoading) {
    return null;
  }

  if (!nextPeriodDate) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <AlertCircle size={24} color="#FFB6C1" />
          <Text style={styles.emptyText}>{t.logMoreData}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t.nextPeriod}</Text>
      <View style={styles.predictionCard}>
        <CalendarClock size={32} color="#FFB6C1" />
        <View style={styles.predictionInfo}>
          <Text style={styles.dateText}>{nextPeriodDate}</Text>
          <Text style={styles.daysText}>
            {daysUntilNextPeriod} {t.daysAway}
          </Text>
        </View>
      </View>
      <View style={styles.cycleInfo}>
        <Text style={styles.cycleLengthText}>
          {t.averageCycle}: {cycleLength} {t.days}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  predictionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  predictionInfo: {
    marginLeft: 15,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  daysText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cycleInfo: {
    marginTop: 10,
    alignItems: 'center',
  },
  cycleLengthText: {
    fontSize: 14,
    color: '#999',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
  },
  emptyText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});
