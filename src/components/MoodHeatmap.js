import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../constants/translations';
import { getMoodData } from '../utils/storage';

const MOOD_COLORS = {
  happy: '#4CAF50',
  neutral: '#FFC107',
  sad: '#FF5722',
};

const MOOD_EMOJIS = {
  happy: 'H',
  neutral: 'N',
  sad: 'S',
};

export default function MoodHeatmap() {
  const { language } = useLanguage();
  const t = translations[language];
  const [moodData, setMoodData] = useState([]);

  useEffect(() => {
    loadMoodData();
  }, []);

  const loadMoodData = async () => {
    const data = await getMoodData();
    if (data) {
      // Get last 14 days of mood data
      const sortedData = Object.entries(data)
        .map(([date, mood]) => ({ date, mood }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 14);
      setMoodData(sortedData);
    }
  };

  const getMoodStats = () => {
    if (moodData.length === 0) return null;
    
    const counts = { happy: 0, neutral: 0, sad: 0 };
    moodData.forEach(({ mood }) => {
      counts[mood]++;
    });
    
    return counts;
  };

  const stats = getMoodStats();

  if (moodData.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrendingUp size={20} color="#FFB6C1" />
        <Text style={styles.sectionTitle}>{t.moodTracker}</Text>
      </View>

      <View style={styles.heatmapCard}>
        <View style={styles.moodGrid}>
          {moodData.map((item, index) => (
            <View
              key={item.date}
              style={[
                styles.moodCell,
                { backgroundColor: MOOD_COLORS[item.mood] + '30' },
              ]}
            >
              <Text style={[styles.moodEmoji, { color: MOOD_COLORS[item.mood] }]}>{MOOD_EMOJIS[item.mood]}</Text>
              <Text style={styles.dateLabel}>
                {new Date(item.date).getDate()}
              </Text>
            </View>
          ))}
        </View>

        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statEmoji, { color: '#4CAF50' }]}>Good</Text>
              <Text style={styles.statCount}>{stats.happy}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statEmoji, { color: '#FFC107' }]}>Okay</Text>
              <Text style={styles.statCount}>{stats.neutral}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statEmoji, { color: '#FF5722' }]}>Low</Text>
              <Text style={styles.statCount}>{stats.sad}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  heatmapCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodCell: {
    width: 40,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 18,
  },
  dateLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
});
