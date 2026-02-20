/**
 * ASHAScreen.js
 * ─────────────────────────────────────────────
 * ASHA Worker Mode — field visit management.
 *
 * Features:
 *   - Quick-assess multiple patients
 *   - View visit history
 *   - Track high-risk counts per village
 *   - Sync status indicator
 *   - Navigate to symptom form for each patient
 *
 * No patient names are stored — only anonymized
 * village-level aggregated data.
 * ─────────────────────────────────────────────
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../context/LanguageContext';
import {
  getHealthRecords,
  getASHAVisits,
  saveASHAVisit,
  saveRole,
} from '../services/storageService';
import { getLocationDisplayName, clearSavedLocation } from '../services/locationService';
import { syncPendingData, getSyncStatus } from '../services/syncService';
import { RISK_LEVELS, RISK_COLORS } from '../utils/constants';

// ── Translations ───────────────────────────────
const t = {
  en: {
    title: 'ASHA Worker Dashboard',
    village: 'Location',
    todaySummary: "Today's Summary",
    totalAssessed: 'Assessed',
    highRisk: 'High Risk',
    moderate: 'Moderate',
    lowRisk: 'Low Risk',
    newAssessment: '+ New Patient Assessment',
    recentRecords: 'Recent Records',
    syncStatus: 'Sync Status',
    pending: 'Pending',
    lastSync: 'Last Sync',
    syncNow: 'Sync Now',
    syncing: 'Syncing...',
    online: 'Online',
    offline: 'Offline',
    noRecords: 'No assessments yet today. Tap "New Patient Assessment" to begin.',
    endVisit: 'End Visit & Save Summary',
    visitSaved: 'Visit summary saved successfully!',
    never: 'Never',
    score: 'Score',
    switchRole: 'Change Role',
  },
  hi: {
    title: 'आशा कार्यकर्ता डैशबोर्ड',
    village: 'स्थान',
    todaySummary: 'आज का सारांश',
    totalAssessed: 'मूल्यांकन किए',
    highRisk: 'उच्च जोखिम',
    moderate: 'मध्यम',
    lowRisk: 'कम जोखिम',
    newAssessment: '+ नया रोगी मूल्यांकन',
    recentRecords: 'हालिया रिकॉर्ड',
    syncStatus: 'सिंक स्थिति',
    pending: 'लंबित',
    lastSync: 'अंतिम सिंक',
    syncNow: 'अभी सिंक करें',
    syncing: 'सिंक हो रहा है...',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    noRecords: 'आज अभी तक कोई मूल्यांकन नहीं। शुरू करने के लिए "नया रोगी मूल्यांकन" दबाएं।',
    endVisit: 'दौरा समाप्त करें और सारांश सहेजें',
    visitSaved: 'दौरा सारांश सफलतापूर्वक सहेजा गया!',
    never: 'कभी नहीं',
    score: 'स्कोर',
    switchRole: 'भूमिका बदलें',
  },
};

export default function ASHAScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useContext(LanguageContext);
  const lang = language === 'hi' ? 'hi' : 'en';
  const texts = t[lang];

  const [locationName, setLocationName] = useState('');
  const [todayRecords, setTodayRecords] = useState([]);
  const [syncInfo, setSyncInfo] = useState({ pendingCount: 0, lastSync: null, isOnline: false });
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load Data ────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [locName, records, status] = await Promise.all([
        getLocationDisplayName(),
        getHealthRecords(),
        getSyncStatus(),
      ]);

      setLocationName(locName || 'N/A');
      setSyncInfo(status);

      // Filter today's records
      const today = new Date().toISOString().split('T')[0];
      const todayRecs = records.filter((r) => r.timestamp?.startsWith(today));
      setTodayRecords(todayRecs.reverse()); // Most recent first
    } catch (error) {
      console.error('[ASHAScreen] Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Pull-to-refresh ──────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Sync Handler ─────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPendingData();
      await loadData(); // Refresh status
      Alert.alert(
        '',
        lang === 'hi'
          ? `${result.synced} रिकॉर्ड सिंक किए गए`
          : `${result.synced} records synced`
      );
    } catch (error) {
      console.error('[ASHAScreen] Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ── End Visit ────────────────────────────────
  const handleEndVisit = async () => {
    const summary = getSummary();
    await saveASHAVisit({
      villageCode: locationName,
      patientsAssessed: todayRecords.length,
      highRiskCount: summary.high,
      notes: `Moderate: ${summary.moderate}, Low: ${summary.low}`,
    });

    Alert.alert('✅', texts.visitSaved);
  };

  // ── Summary Calculations ─────────────────────
  const getSummary = () => {
    const high = todayRecords.filter((r) => r.level === RISK_LEVELS.HIGH).length;
    const moderate = todayRecords.filter((r) => r.level === RISK_LEVELS.MODERATE).length;
    const low = todayRecords.filter((r) => r.level === RISK_LEVELS.LOW).length;
    return { total: todayRecords.length, high, moderate, low };
  };

  const summary = getSummary();

  // ── Render Record Item ───────────────────────
  const renderRecord = ({ item, index }) => (
    <View style={[styles.recordItem, { borderLeftColor: RISK_COLORS[item.level] || '#999' }]}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordIndex}>#{index + 1}</Text>
        <Text style={[styles.recordLevel, { color: RISK_COLORS[item.level] }]}>
          {item.level}
        </Text>
      </View>
      <Text style={styles.recordScore}>
        {texts.score}: {item.score}
      </Text>
      <Text style={styles.recordTime}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Text style={styles.title}>{texts.title}</Text>
        <Text style={styles.villageLabel}>
          {texts.village}: <Text style={styles.villageCode}>{locationName}</Text>
        </Text>

        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{texts.todaySummary}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>{texts.totalAssessed}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: RISK_COLORS.HIGH }]}>
                {summary.high}
              </Text>
              <Text style={styles.summaryLabel}>{texts.highRisk}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: RISK_COLORS.MODERATE }]}>
                {summary.moderate}
              </Text>
              <Text style={styles.summaryLabel}>{texts.moderate}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: RISK_COLORS.LOW }]}>
                {summary.low}
              </Text>
              <Text style={styles.summaryLabel}>{texts.lowRisk}</Text>
            </View>
          </View>
        </View>

        {/* New Assessment Button */}
        <TouchableOpacity
          style={styles.newAssessmentBtn}
          onPress={() => router.push('/symptoms')}
          activeOpacity={0.7}
        >
          <Text style={styles.newAssessmentBtnText}>{texts.newAssessment}</Text>
        </TouchableOpacity>

        {/* Recent Records */}
        <Text style={styles.sectionTitle}>{texts.recentRecords}</Text>
        {todayRecords.length === 0 ? (
          <Text style={styles.noRecords}>{texts.noRecords}</Text>
        ) : (
          todayRecords.map((item, index) => (
            <View key={item.id}>
              {renderRecord({ item, index })}
            </View>
          ))
        )}

        {/* Sync Status */}
        <View style={styles.syncCard}>
          <Text style={styles.sectionTitle}>{texts.syncStatus}</Text>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>
              {syncInfo.isOnline ? `🟢 ${texts.online}` : `🔴 ${texts.offline}`}
            </Text>
            <Text style={styles.syncLabel}>
              {texts.pending}: {syncInfo.pendingCount}
            </Text>
          </View>
          <Text style={styles.syncLabel}>
            {texts.lastSync}: {syncInfo.lastSync
              ? new Date(syncInfo.lastSync).toLocaleString()
              : texts.never}
          </Text>
          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            <Text style={styles.syncBtnText}>
              {isSyncing ? texts.syncing : texts.syncNow}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Visit */}
        {todayRecords.length > 0 && (
          <TouchableOpacity
            style={styles.endVisitBtn}
            onPress={handleEndVisit}
            activeOpacity={0.7}
          >
            <Text style={styles.endVisitBtnText}>{texts.endVisit}</Text>
          </TouchableOpacity>
        )}

        {/* Switch Mode */}
        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => {
            Alert.alert(
              lang === 'hi' ? 'भूमिका बदलें?' : 'Change Role?',
              lang === 'hi'
                ? 'यह आपको भूमिका चयन पृष्ठ पर ले जाएगा।'
                : 'This will take you to role selection.',
              [
                { text: lang === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
                {
                  text: lang === 'hi' ? 'पुष्टि करें' : 'Confirm',
                  onPress: async () => {
                    await saveRole('');
                    await clearSavedLocation();
                    router.replace('/role-select');
                  },
                },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.switchBtnText}>{texts.switchRole}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  villageLabel: {
    fontSize: 15,
    color: '#888',
    marginBottom: 20,
  },
  villageCode: {
    fontWeight: '700',
    color: '#555',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  newAssessmentBtn: {
    backgroundColor: '#FFB6C1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  newAssessmentBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#555',
    marginBottom: 12,
  },
  noRecords: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 20,
  },
  recordItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordIndex: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  recordLevel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recordScore: {
    fontSize: 13,
    color: '#666',
  },
  recordTime: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 2,
  },
  syncCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  syncLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  syncBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  endVisitBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  endVisitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchBtn: {
    borderWidth: 2,
    borderColor: '#FFB6C1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  switchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFB6C1',
  },
});
