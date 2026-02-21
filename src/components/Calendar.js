import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
  Droplet,
  Smile,
  Frown,
  Meh,
  Heart,
  X,
  Check,
  ChevronDown,
  AlertTriangle,
  Zap,
  Moon,
  Cookie,
  CloudRain,
} from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../constants/translations';
import {
  savePeriodData,
  getPeriodData,
  saveMoodData,
  getMoodData,
  saveFlowData,
  getFlowData,
  removeFlowData,
  saveDailyLog,
  getDailyLogs,
  getDailyLog,
  saveSymptoms,
} from '../utils/storage';
import { useCycleTracker, PHASE_COLORS } from '../hooks/useCycleTracker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ── Option Definitions ── */

const SYMPTOM_OPTIONS = [
  { key: 'cramps', icon: Zap, color: '#E53935' },
  { key: 'headache', icon: AlertTriangle, color: '#FF7043' },
  { key: 'backPain', icon: AlertTriangle, color: '#FFA726' },
  { key: 'bloating', icon: CloudRain, color: '#42A5F5' },
  { key: 'breastTenderness', icon: Heart, color: '#EC407A' },
  { key: 'acne', icon: Frown, color: '#AB47BC' },
  { key: 'nausea', icon: Frown, color: '#66BB6A' },
  { key: 'calFatigue', icon: Moon, color: '#78909C' },
  { key: 'insomnia', icon: Moon, color: '#5C6BC0' },
  { key: 'cravings', icon: Cookie, color: '#8D6E63' },
];

const FLOW_OPTIONS = [
  { key: 'spotting', color: PHASE_COLORS.spotting, dotColor: '#FFCDD2' },
  { key: 'flowLight', color: PHASE_COLORS.periodLight, dotColor: '#EF9A9A' },
  { key: 'flowMedium', color: PHASE_COLORS.periodMed, dotColor: '#E57373' },
  { key: 'flowHeavy', color: PHASE_COLORS.periodHeavy, dotColor: '#C62828' },
];

const MOOD_OPTIONS = [
  { key: 'happy', icon: Smile, color: '#4CAF50', label: 'happy' },
  { key: 'neutral', icon: Meh, color: '#FFC107', label: 'neutral' },
  { key: 'sad', icon: Frown, color: '#FF5722', label: 'sad' },
];

export default function CycleCalendar() {
  const { language } = useLanguage();
  const t = translations[language];

  const {
    nextPeriodDateStr,
    daysUntilNextPeriod,
    cycleLength,
    periodLength,
    predictedPeriodDates,
    fertileDates,
    ovulationDate,
    currentPhase,
    dayOfCycle,
    isLoading,
    refresh,
  } = useCycleTracker();

  const [markedDates, setMarkedDates] = useState({});
  const [periodDatesSet, setPeriodDatesSet] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [legendVisible, setLegendVisible] = useState(false);

  // Modal logging state
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [existingLog, setExistingLog] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Rebuild calendar marks when cycle data changes
  useEffect(() => {
    if (!isLoading) buildMarkedDates();
  }, [predictedPeriodDates, fertileDates, ovulationDate, isLoading]);

  const buildMarkedDates = useCallback(async () => {
    const marked = {};
    const periodData = await getPeriodData();
    const periodSet = new Set(periodData || []);
    setPeriodDatesSet(periodSet);
    const flowLocal = (await getFlowData()) || {};
    const moodLocal = (await getMoodData()) || {};

    // 1. Predicted period (dashed pink)
    (predictedPeriodDates || []).forEach(ds => {
      if (!periodSet.has(ds)) {
        marked[ds] = {
          customStyles: {
            container: { backgroundColor: PHASE_COLORS.predicted, borderRadius: 8, borderWidth: 2, borderColor: '#F06292' },
            text: { color: '#FFF', fontWeight: 'bold' },
          },
        };
      }
    });

    // 2. Fertile window (green)
    (fertileDates || []).forEach(ds => {
      if (!periodSet.has(ds) && !marked[ds]) {
        marked[ds] = {
          customStyles: {
            container: { backgroundColor: PHASE_COLORS.fertile, borderRadius: 8 },
            text: { color: '#FFF', fontWeight: '500' },
          },
        };
      }
    });

    // 3. Ovulation (dark green circle)
    if (ovulationDate && !periodSet.has(ovulationDate)) {
      marked[ovulationDate] = {
        customStyles: {
          container: { backgroundColor: PHASE_COLORS.ovulation, borderRadius: 20, borderWidth: 3, borderColor: '#2E7D32' },
          text: { color: '#FFF', fontWeight: 'bold' },
        },
      };
    }

    // 4. Logged period dates – colour by flow
    periodSet.forEach(ds => {
      const flow = flowLocal[ds];
      let bg = PHASE_COLORS.period;
      if (flow === 'spotting') bg = PHASE_COLORS.spotting;
      else if (flow === 'light') bg = PHASE_COLORS.periodLight;
      else if (flow === 'medium') bg = PHASE_COLORS.periodMed;
      else if (flow === 'heavy') bg = PHASE_COLORS.periodHeavy;

      marked[ds] = {
        customStyles: {
          container: {
            backgroundColor: bg,
            borderRadius: 8,
            ...(flow === 'heavy' ? { borderWidth: 2, borderColor: '#B71C1C' } : {}),
          },
          text: { color: flow === 'spotting' ? '#C62828' : '#FFF', fontWeight: 'bold' },
        },
      };
    });

    // 5. Days with mood only
    Object.keys(moodLocal).forEach(ds => {
      if (!periodSet.has(ds) && !marked[ds]) {
        const m = moodLocal[ds];
        let dc = '#FFC107';
        if (m === 'happy') dc = '#4CAF50';
        else if (m === 'sad') dc = '#FF5722';
        marked[ds] = {
          customStyles: {
            container: { backgroundColor: '#FFF8E1', borderRadius: 8, borderWidth: 1, borderColor: dc },
            text: { color: '#333' },
          },
        };
      }
    });

    // 6. Today ring
    if (marked[todayStr]) {
      const c = marked[todayStr].customStyles?.container || {};
      marked[todayStr] = {
        ...marked[todayStr],
        customStyles: {
          ...marked[todayStr].customStyles,
          container: { ...c, borderWidth: 3, borderColor: PHASE_COLORS.today },
        },
      };
    } else {
      marked[todayStr] = {
        customStyles: {
          container: { borderWidth: 3, borderColor: PHASE_COLORS.today, borderRadius: 8 },
          text: { color: PHASE_COLORS.today, fontWeight: 'bold' },
        },
      };
    }

    setMarkedDates(marked);
  }, [predictedPeriodDates, fertileDates, ovulationDate, todayStr]);

  /* ── Day press handler ── */
  const handleDayPress = async (day) => {
    const ds = day.dateString;
    setSelectedDate(ds);

    const existingPeriod = periodDatesSet.has(ds);
    const flowAll = (await getFlowData()) || {};
    const moodAll = (await getMoodData()) || {};
    const log = await getDailyLog(ds);

    setIsPeriodDay(existingPeriod);
    setSelectedFlow(flowAll[ds] || null);
    setSelectedMood(moodAll[ds] || null);
    setSelectedSymptoms(log?.symptoms || []);
    setExistingLog(log);
    setModalVisible(true);
  };

  /* ── Save handler ── */
  const handleSave = async () => {
    const cur = (await getPeriodData()) || [];
    const set = new Set(cur);

    if (isPeriodDay) {
      set.add(selectedDate);
      if (selectedFlow) await saveFlowData(selectedDate, selectedFlow);
    } else {
      set.delete(selectedDate);
      await removeFlowData(selectedDate);
    }

    await savePeriodData([...set]);
    if (selectedMood) await saveMoodData(selectedDate, selectedMood);
    if (selectedSymptoms.length > 0) await saveSymptoms(selectedDate, selectedSymptoms);

    await saveDailyLog(selectedDate, {
      isPeriod: isPeriodDay,
      flow: isPeriodDay ? selectedFlow : null,
      mood: selectedMood,
      symptoms: selectedSymptoms,
    });

    setModalVisible(false);
    await refresh();
    await buildMarkedDates();
  };

  /* ── Remove handler ── */
  const handleRemoveLog = () => {
    Alert.alert(
      '',
      language === 'hi' ? 'इस दिन का सारा डेटा हटाएं?' : 'Remove all data for this day?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          style: 'destructive',
          onPress: async () => {
            const cur = (await getPeriodData()) || [];
            await savePeriodData(cur.filter(d => d !== selectedDate));
            await removeFlowData(selectedDate);
            setModalVisible(false);
            await refresh();
            await buildMarkedDates();
          },
        },
      ]
    );
  };

  const toggleSymptom = (key) => {
    setSelectedSymptoms(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const isFutureDate = selectedDate > todayStr;

  /* ── Render ── */
  return (
    <View style={styles.container}>
      {/* Phase status bar */}
      {currentPhase && dayOfCycle > 0 && (
        <View style={styles.phaseBar}>
          <View style={styles.phaseInfo}>
            <View style={[styles.phaseDot, { backgroundColor: getPhaseColor(currentPhase) }]} />
            <Text style={styles.phaseText}>
              {getPhaseLabel(currentPhase, t)} • {t.dayOfCycle} {dayOfCycle} {t.ofCycle}
            </Text>
          </View>
          {daysUntilNextPeriod != null && (
            <Text style={styles.daysUntilText}>{daysUntilNextPeriod} {t.daysUntilPeriod}</Text>
          )}
        </View>
      )}

      {/* Calendar */}
      <Calendar
        onDayPress={handleDayPress}
        markingType="custom"
        markedDates={markedDates}
        theme={{
          backgroundColor: '#FFF5F5',
          calendarBackground: '#FFF',
          textSectionTitleColor: '#333',
          todayTextColor: PHASE_COLORS.today,
          dayTextColor: '#333',
          textDisabledColor: '#CCC',
          arrowColor: '#C2185B',
          monthTextColor: '#333',
          indicatorColor: '#C2185B',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 15,
          textMonthFontSize: 18,
        }}
        style={styles.calendar}
        enableSwipeMonths
      />

      {/* Colour legend toggle */}
      <TouchableOpacity style={styles.legendToggle} onPress={() => setLegendVisible(v => !v)}>
        <Text style={styles.legendToggleText}>{t.legend}</Text>
        <ChevronDown size={18} color="#666" style={legendVisible ? { transform: [{ rotate: '180deg' }] } : {}} />
      </TouchableOpacity>

      {legendVisible && (
        <View style={styles.legendContainer}>
          <LegendItem color={PHASE_COLORS.period} label={t.phaseMenustrual} />
          <LegendItem color={PHASE_COLORS.periodHeavy} label={t.flowHeavy} border="#B71C1C" />
          <LegendItem color={PHASE_COLORS.periodLight} label={t.flowLight} />
          <LegendItem color={PHASE_COLORS.spotting} label={t.flowSpotting} />
          <LegendItem color={PHASE_COLORS.predicted} label={t.phasePredicted} border="#F06292" />
          <LegendItem color={PHASE_COLORS.fertile} label={t.phaseFertile} />
          <LegendItem color={PHASE_COLORS.ovulation} label={t.phaseOvulation} border="#2E7D32" />
          <LegendItem color="transparent" label={t.today} border={PHASE_COLORS.today} />
        </View>
      )}

      {/* Day-logging modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{fmtDate(selectedDate, language)}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#666" /></TouchableOpacity>
              </View>

              {/* Future-date info */}
              {isFutureDate && (
                <>
                  <View style={styles.futureNote}>
                    <Text style={styles.futureNoteText}>
                      {predNote(selectedDate, predictedPeriodDates, fertileDates, ovulationDate, t)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButtonText}>{t.close}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Logging form (past / today only) */}
              {!isFutureDate && (
                <>
                  {/* Period toggle */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.logPeriod}</Text>
                    <View style={styles.periodToggle}>
                      <TouchableOpacity
                        style={[styles.periodToggleBtn, isPeriodDay && styles.periodToggleBtnActive]}
                        onPress={() => setIsPeriodDay(true)}
                      >
                        <Droplet size={20} color={isPeriodDay ? '#FFF' : '#E53935'} />
                        <Text style={[styles.periodToggleText, isPeriodDay && styles.periodToggleTextActive]}>{t.logPeriod}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.periodToggleBtn, !isPeriodDay && styles.noPeriodBtnActive]}
                        onPress={() => { setIsPeriodDay(false); setSelectedFlow(null); }}
                      >
                        <Text style={[styles.periodToggleText, !isPeriodDay && styles.noPeriodTextActive]}>{t.noPeriod}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Flow intensity */}
                  {isPeriodDay && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{t.selectFlow}</Text>
                      <View style={styles.flowRow}>
                        {FLOW_OPTIONS.map(o => {
                          const val = flowKey(o.key);
                          const sel = selectedFlow === val;
                          return (
                            <TouchableOpacity
                              key={o.key}
                              style={[styles.flowOption, { borderColor: o.dotColor }, sel && { backgroundColor: o.color, borderColor: o.dotColor }]}
                              onPress={() => setSelectedFlow(val)}
                            >
                              <View style={[styles.flowDot, { backgroundColor: o.dotColor }]} />
                              <Text style={[styles.flowOptionText, sel && styles.flowOptionTextActive]}>{t[o.key]}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Mood */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.logMood}</Text>
                    <View style={styles.moodRow}>
                      {MOOD_OPTIONS.map(o => {
                        const Icon = o.icon;
                        const sel = selectedMood === o.key;
                        return (
                          <TouchableOpacity key={o.key}
                            style={[styles.moodButton, sel && { backgroundColor: o.color + '20', borderColor: o.color, borderWidth: 2 }]}
                            onPress={() => setSelectedMood(sel ? null : o.key)}
                          >
                            <Icon size={30} color={o.color} />
                            <Text style={[styles.moodLabel, { color: o.color }]}>{t[o.label]}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Symptoms */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t.calSymptoms}</Text>
                    <View style={styles.symptomGrid}>
                      {SYMPTOM_OPTIONS.map(o => {
                        const Icon = o.icon;
                        const sel = selectedSymptoms.includes(o.key);
                        return (
                          <TouchableOpacity key={o.key}
                            style={[styles.symptomChip, sel && { backgroundColor: o.color + '20', borderColor: o.color }]}
                            onPress={() => toggleSymptom(o.key)}
                          >
                            <Icon size={16} color={sel ? o.color : '#999'} />
                            <Text style={[styles.symptomChipText, sel && { color: o.color }]}>{t[o.key]}</Text>
                            {sel && <Check size={14} color={o.color} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Save */}
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Check size={22} color="#FFF" />
                    <Text style={styles.saveButtonText}>{t.save}</Text>
                  </TouchableOpacity>

                  {/* Remove */}
                  {(periodDatesSet.has(selectedDate) || existingLog) && (
                    <TouchableOpacity style={styles.removeButton} onPress={handleRemoveLog}>
                      <Text style={styles.removeButtonText}>{t.removePeriodLog}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ── Small helpers ── */

function LegendItem({ color, label, border }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }, border ? { borderWidth: 2, borderColor: border } : {}]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function flowKey(k) {
  const m = { spotting: 'spotting', flowLight: 'light', flowMedium: 'medium', flowHeavy: 'heavy' };
  return m[k] || k;
}

function getPhaseColor(p) {
  switch (p) {
    case 'menstrual': return PHASE_COLORS.period;
    case 'fertile': return PHASE_COLORS.fertile;
    case 'ovulation': return PHASE_COLORS.ovulation;
    case 'follicular': return '#42A5F5';
    case 'luteal': return '#FFA726';
    default: return '#999';
  }
}

function getPhaseLabel(p, t) {
  switch (p) {
    case 'menstrual': return t.phaseMenustrual;
    case 'fertile': return t.phaseFertile;
    case 'ovulation': return t.phaseOvulation;
    case 'follicular': return '🌱 Follicular';
    case 'luteal': return '🌙 Luteal';
    default: return t.phaseRegular;
  }
}

function fmtDate(ds, lang) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function predNote(ds, pred, fert, ov, t) {
  if (pred && pred.includes(ds)) return `🔮 ${t.phasePredicted}`;
  if (ov === ds) return `🥚 ${t.phaseOvulation}`;
  if (fert && fert.includes(ds)) return `🌿 ${t.phaseFertile}`;
  return t.noDataForDay;
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: { marginHorizontal: 12 },

  /* Phase bar */
  phaseBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    marginBottom: 10, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  phaseInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  phaseDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  phaseText: { fontSize: 13, fontWeight: '600', color: '#333' },
  daysUntilText: { fontSize: 12, color: '#C2185B', fontWeight: '600', marginLeft: 8 },

  /* Calendar */
  calendar: {
    borderRadius: 15, elevation: 3, paddingBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },

  /* Legend */
  legendToggle: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 6 },
  legendToggleText: { fontSize: 14, color: '#666', fontWeight: '500' },
  legendContainer: {
    flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFF', borderRadius: 12,
    padding: 12, gap: 10, elevation: 1, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', minWidth: (SCREEN_WIDTH - 80) / 2, marginVertical: 2 },
  legendDot: { width: 18, height: 18, borderRadius: 4, marginRight: 8 },
  legendLabel: { fontSize: 12, color: '#555' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', flex: 1 },

  /* Sections */
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },

  /* Period toggle */
  periodToggle: { flexDirection: 'row', gap: 10 },
  periodToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#EEE', gap: 8,
  },
  periodToggleBtnActive: { backgroundColor: '#E53935', borderColor: '#E53935' },
  noPeriodBtnActive: { backgroundColor: '#F5F5F5', borderColor: '#CCC' },
  periodToggleText: { fontSize: 15, fontWeight: '600', color: '#666' },
  periodToggleTextActive: { color: '#FFF' },
  noPeriodTextActive: { color: '#666' },

  /* Flow */
  flowRow: { flexDirection: 'row', gap: 8 },
  flowOption: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 12, borderWidth: 2, borderColor: '#EEE' },
  flowDot: { width: 20, height: 20, borderRadius: 10, marginBottom: 6 },
  flowOptionText: { fontSize: 11, color: '#666', fontWeight: '500', textAlign: 'center' },
  flowOptionTextActive: { color: '#FFF', fontWeight: '700' },

  /* Mood */
  moodRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  moodButton: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  moodLabel: { fontSize: 12, marginTop: 4, fontWeight: '500' },

  /* Symptoms */
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0', gap: 5,
  },
  symptomChipText: { fontSize: 12, color: '#888', fontWeight: '500' },

  /* Buttons */
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C2185B', paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 5,
  },
  saveButtonText: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  removeButton: { padding: 14, alignItems: 'center', marginTop: 5 },
  removeButtonText: { color: '#E53935', fontSize: 14, fontWeight: '500' },
  closeButton: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  closeButtonText: { fontSize: 16, color: '#666' },

  /* Future note */
  futureNote: { backgroundColor: '#F3E5F5', borderRadius: 12, padding: 16, marginBottom: 15 },
  futureNoteText: { fontSize: 15, color: '#6A1B9A', textAlign: 'center', fontWeight: '500' },
});
