import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Plus, Droplet, Heart, Frown, Smile, Meh } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../constants/translations';
import { savePeriodData, getPeriodData, saveMoodData } from '../utils/storage';

export default function CycleCalendar() {
  const { language } = useLanguage();
  const t = translations[language];
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPeriodData();
  }, []);

  const loadPeriodData = async () => {
    try {
      const data = await getPeriodData();
      if (data && Array.isArray(data)) {
        const marked = {};
        data.forEach(date => {
          if (typeof date === 'string') {
            marked[date] = {
              selected: true,
              selectedColor: '#FFB6C1',
              marked: true,
              dotColor: '#FF6B6B',
            };
          }
        });
        setMarkedDates(marked);
      }
    } catch (e) {
      console.warn('[Calendar] Failed to load period data:', e);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDayPress = (day) => {
    if (day.dateString > todayStr) {
      Alert.alert(
        '',
        language === 'hi' ? 'भविष्य की तारीख लॉग नहीं कर सकते' : 'Cannot log future dates'
      );
      return;
    }
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const logPeriod = async () => {
    const newMarkedDates = {
      ...markedDates,
      [selectedDate]: {
        selected: true,
        selectedColor: '#FFB6C1',
        marked: true,
        dotColor: '#FF6B6B',
      },
    };
    setMarkedDates(newMarkedDates);
    
    const periodDates = Object.keys(newMarkedDates);
    await savePeriodData(periodDates);
    setModalVisible(false);
  };

  const logMood = async (mood) => {
    await saveMoodData(selectedDate, mood);
    setModalVisible(false);
  };

  const removePeriodLog = async () => {
    const newMarkedDates = { ...markedDates };
    delete newMarkedDates[selectedDate];
    setMarkedDates(newMarkedDates);
    
    const periodDates = Object.keys(newMarkedDates);
    await savePeriodData(periodDates);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#FFF5F5',
          calendarBackground: '#FFF',
          textSectionTitleColor: '#333',
          selectedDayBackgroundColor: '#FFB6C1',
          selectedDayTextColor: '#FFF',
          todayTextColor: '#FFB6C1',
          dayTextColor: '#333',
          textDisabledColor: '#CCC',
          dotColor: '#FF6B6B',
          selectedDotColor: '#FFF',
          arrowColor: '#FFB6C1',
          monthTextColor: '#333',
          indicatorColor: '#FFB6C1',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
        }}
        maxDate={todayStr}
        style={styles.calendar}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedDate}</Text>
            <Text style={styles.modalSubtitle}>{t.whatToLog}</Text>

            <TouchableOpacity style={styles.logButton} onPress={logPeriod}>
              <Droplet size={24} color="#FF6B6B" />
              <Text style={styles.logButtonText}>{t.logPeriod}</Text>
            </TouchableOpacity>

            <Text style={styles.moodLabel}>{t.logMood}</Text>
            <View style={styles.moodRow}>
              <TouchableOpacity style={styles.moodButton} onPress={() => logMood('happy')}>
                <Smile size={32} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.moodButton} onPress={() => logMood('neutral')}>
                <Meh size={32} color="#FFC107" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.moodButton} onPress={() => logMood('sad')}>
                <Frown size={32} color="#FF5722" />
              </TouchableOpacity>
            </View>

            {markedDates[selectedDate] && (
              <TouchableOpacity style={styles.removeButton} onPress={removePeriodLog}>
                <Text style={styles.removeButtonText}>{t.removePeriodLog}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
  },
  calendar: {
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  logButtonText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  moodLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  moodButton: {
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 50,
  },
  removeButton: {
    padding: 12,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
});
