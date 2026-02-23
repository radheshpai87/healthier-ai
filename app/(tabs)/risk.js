import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Volume2,
  RefreshCw,
  User,
  Moon,
  Dumbbell,
  Brain,
  ChevronDown,
  ChevronUp,
  Heart,
  Clipboard,
  Clock,
  Sparkles,
  TrendingUp,
  FileText,
  Pill,
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import { translations } from '../../src/constants/translations';
import {
  performRiskAssessment,
  getUserProfile,
  saveUserProfile,
  logDailyHealth,
  calculateHealthScore,
  getRiskHistory,
  getDailyLogs as getHealthLogs,
  getSymptoms as getSymptomLogs,
} from '../../src/services/HealthDataLogger';
import { getLastRiskResult } from '../../src/services/storageService';
import { generateSymptomAdvice } from '../../src/api/groq';
import { getSyncStatus, syncPendingData } from '../../src/services/syncService';

const { width } = Dimensions.get('window');

// -- i18n --
const localT = {
  en: {
    pageTitle: 'Overall Health',
    pageSubtitle: 'Your complete health overview',
    healthScore: 'Health Score',
    noScoreYet: 'Complete your profile to see your score',
    sleepScore: 'Sleep',
    stressScore: 'Stress',
    exerciseScore: 'Exercise',
    bmiScore: 'BMI',
    daysLogged: 'days logged',
    lastAssessment: 'Last Risk Assessment',
    riskLevel: 'Risk Level',
    lowRisk: 'Low Risk',
    mediumRisk: 'Medium Risk',
    highRisk: 'High Risk',
    unknownRisk: 'Not Assessed',
    confidence: 'Confidence',
    noAssessment: 'No risk assessment yet',
    runAssessment: 'Run Assessment',
    fullCheckup: 'Full Symptom Check',
    symptomHistory: 'Symptom History',
    noSymptoms: 'No symptoms logged yet. Use "Full Symptom Check" to log your first assessment.',
    symptomsLogged: 'symptoms logged',
    viewAll: 'Show More',
    viewLess: 'Show Less',
    riskResult: 'Risk',
    aiInsight: 'AI Insight',
    loadingAI: 'Generating insight...',
    getAiInsight: 'Get AI Insight',
    hideInsight: 'Hide Insight',
    showInsight: 'Show Insight',
    autoInsight: 'AI Insights',
    dailyLog: 'Quick Daily Log',
    stressLevel: 'Stress Level',
    sleepHours: 'Sleep (hrs)',
    exerciseMin: 'Exercise (min)',
    saveLog: 'Save Log',
    logSaved: 'Daily log saved!',
    healthProfile: 'Health Profile',
    age: 'Age',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    saveProfile: 'Save Profile',
    profileSaved: 'Profile saved!',
    success: 'Success',
    cancel: 'Cancel',
    syncStatus: 'Sync Status',
    online: 'Online',
    offline: 'Offline',
    pendingSync: 'Pending',
    lastSync: 'Last Sync',
    syncNow: 'Sync Now',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    source: 'Source',
    mlPowered: 'ML-Powered',
    offlineAnalysis: 'Offline Analysis',
    ruleBased: 'Rule-Based',
  },
  hi: {
    pageTitle: 'समगर सवसथय',
    pageSubtitle: 'आपक परण सवसथय अवलकन',
    healthScore: 'सवसथय सकर',
    noScoreYet: 'अपन सकर दखन क लए परफइल पर कर',
    sleepScore: 'नद',
    stressScore: 'तनव',
    exerciseScore: 'वययम',
    bmiScore: 'BMI',
    daysLogged: 'दन लग',
    lastAssessment: 'अतम जखम मलयकन',
    riskLevel: 'जखम सतर',
    lowRisk: 'कम जखम',
    mediumRisk: 'मधयम जखम',
    highRisk: 'उचच जखम',
    unknownRisk: 'मलयकन नह हआ',
    confidence: 'वशवसनयत',
    noAssessment: 'अभ तक कई जखम मलयकन नह',
    runAssessment: 'मलयकन कर',
    fullCheckup: 'परण लकषण जच',
    symptomHistory: 'लकषण इतहस',
    noSymptoms: 'अभ तक कई लकषण लग नह पहल मलयकन करन क लए "परण लकषण जच" क उपयग कर',
    symptomsLogged: 'लकषण लग',
    viewAll: 'और दख',
    viewLess: 'कम दख',
    riskResult: 'जखम',
    aiInsight: 'AI अतरदषट',
    loadingAI: 'अतरदषट तयर ह रह ह...',
    getAiInsight: 'AI अतरदषट परपत कर',
    hideInsight: 'छपए',
    showInsight: 'दखए',
    autoInsight: 'AI अतरदषट',
    dailyLog: 'तवरत दनक लग',
    stressLevel: 'तनव सतर',
    sleepHours: 'नद (घट)',
    exerciseMin: 'वययम (मनट)',
    saveLog: 'लग सहज',
    logSaved: 'दनक लग सहज!',
    healthProfile: 'सवसथय परफइल',
    age: 'आय',
    height: 'ऊचई (सम)',
    weight: 'वजन (कल)',
    saveProfile: 'परफइल सहज',
    profileSaved: 'परफइल सहज!',
    success: 'सफल',
    cancel: 'रदद कर',
    syncStatus: 'सक सथत',
    online: 'ऑनलइन',
    offline: 'ऑफलइन',
    pendingSync: 'लबत',
    lastSync: 'अतम सक',
    syncNow: 'अभ सक कर',
    today: 'आज',
    yesterday: 'कल',
    daysAgo: 'दन पहल',
    source: 'सरत',
    mlPowered: 'ML-सचलत',
    offlineAnalysis: 'ऑफलइन वशलषण',
    ruleBased: 'नयम-आधरत',
  },
};

// -- Helpers --
const getRiskColor = (level) => {
  switch (level) {
    case 'Low': return '#4CAF50';
    case 'Medium': return '#FFA726';
    case 'High': return '#EF5350';
    default: return '#BDBDBD';
  }
};

const getRiskIcon = (level, size = 28) => {
  switch (level) {
    case 'Low': return <CheckCircle size={size} color="#4CAF50" />;
    case 'Medium': return <AlertCircle size={size} color="#FFA726" />;
    case 'High': return <AlertTriangle size={size} color="#EF5350" />;
    default: return <Activity size={size} color="#BDBDBD" />;
  }
};

const formatRelativeDate = (dateStr, t) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t.today;
  if (diffDays === 1) return t.yesterday;
  return `${diffDays} ${t.daysAgo}`;
};

const SYMPTOM_LABELS = {
  en: {
    heavyBleeding: 'Heavy Bleeding',
    fatigue: 'Fatigue',
    dizziness: 'Dizziness',
    irregularCycles: 'Irregular Cycles',
    pain: 'Pain',
    pregnancyIssue: 'Pregnancy Issue',
    lowHb: 'Low Hemoglobin',
    fainted: 'Fainted',
    severePain: 'Severe Pain',
    vomiting: 'Vomiting',
  },
  hi: {
    heavyBleeding: 'भर रकतसरव',
    fatigue: 'थकन',
    dizziness: 'चककर',
    irregularCycles: 'अनयमत चकर',
    pain: 'दरद',
    pregnancyIssue: 'गरभवसथ समसय',
    lowHb: 'कम हमगलबन',
    fainted: 'बहश',
    severePain: 'तवर दरद',
    vomiting: 'उलट',
  },
};

// ============================================
// Component
// ============================================
export default function OverallHealthScreen() {
  const { language } = useLanguage();
  const router = useRouter();
  const t = localT[language] || localT.en;
  const globalT = translations[language] || translations.en;
  const symLabels = SYMPTOM_LABELS[language] || SYMPTOM_LABELS.en;

  // -- State --
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [healthScore, setHealthScore] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [lastRiskResult, setLastRiskResult] = useState(null);
  const [riskHistory, setRiskHistory] = useState([]);
  const [symptomEntries, setSymptomEntries] = useState([]);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [profile, setProfile] = useState({ age: '', height: '', weight: '' });
  const [dailyLog, setDailyLog] = useState({
    stress_level: 3,
    sleep_hours: 7,
    exercise_minutes: 30,
  });

  const [aiInsights, setAiInsights] = useState({});
  const [aiLoadingIdx, setAiLoadingIdx] = useState(null);
  const [collapsedInsights, setCollapsedInsights] = useState({});
  const autoFetchedRef = useRef(false);

  // -- Data Loading --
  const loadData = useCallback(async () => {
    try {
      const savedProfile = await getUserProfile();
      if (savedProfile) {
        setProfile({
          age: savedProfile.age?.toString() || '',
          height: savedProfile.height?.toString() || '',
          weight: savedProfile.weight?.toString() || '',
        });
      }

      const score = await calculateHealthScore();
      setHealthScore(score);

      const history = await getRiskHistory();
      setRiskHistory(history);
      if (history.length > 0) {
        setRiskResult(history[history.length - 1]);
      }

      const lastResult = await getLastRiskResult();
      setLastRiskResult(lastResult);

      const entries = [];

      for (let i = history.length - 1; i >= 0 && entries.length < 50; i--) {
        const item = history[i];
        entries.push({
          date: item.timestamp || new Date().toISOString(),
          riskLevel: item.risk_level,
          confidence: item.confidence,
          source: item.source,
          recommendationKey: item.recommendation_key,
          type: 'assessment',
        });
      }

      if (lastResult && lastResult.symptoms) {
        const activeSymptoms = Object.entries(lastResult.symptoms || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k);
        const activeEmergency = Object.entries(lastResult.emergency || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k);

        if (activeSymptoms.length > 0 || activeEmergency.length > 0) {
          entries.unshift({
            date: lastResult.savedAt || new Date().toISOString(),
            riskLevel: lastResult.level,
            score: lastResult.score,
            confidence: lastResult.mlConfidence,
            source: lastResult.source,
            healthGrade: lastResult.healthGrade,
            symptoms: activeSymptoms,
            emergency: activeEmergency,
            details: lastResult.details,
            type: 'symptom_check',
          });
        }
      }

      setSymptomEntries(entries);

      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('[OverallHealth] loadData error:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-fetch AI insights for symptom_check entries
  useEffect(() => {
    if (autoFetchedRef.current || symptomEntries.length === 0) return;
    const symptomChecks = symptomEntries
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry }) => entry.type === 'symptom_check');
    if (symptomChecks.length === 0) return;
    autoFetchedRef.current = true;
    // Fetch insights for up to first 3 symptom_check entries
    const toFetch = symptomChecks.slice(0, 3);
    (async () => {
      for (const { entry, idx } of toFetch) {
        if (!aiInsights[idx]) {
          await handleGetAiInsight(entry, idx);
        }
      }
    })();
  }, [symptomEntries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // -- Handlers --
  const handleCheckRisk = async () => {
    const currentProfile = await getUserProfile();
    if (!currentProfile || !currentProfile.age) {
      Alert.alert(
        language === 'hi' ? 'परफइल आवशयक' : 'Profile Required',
        language === 'hi'
          ? 'कपय पहल सवसथय परफइल भर'
          : 'Please fill your Health Profile first.',
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.healthProfile, onPress: () => setShowProfile(true) },
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await performRiskAssessment(dailyLog);
      setRiskResult(result);
      const score = await calculateHealthScore();
      setHealthScore(score);
      await loadData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.age) {
      Alert.alert(
        language === 'hi' ? 'आवशयक' : 'Required',
        language === 'hi' ? 'कपय आय दरज कर' : 'Please enter your age'
      );
      return;
    }
    const ageNum = parseInt(profile.age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 60) {
      Alert.alert(
        language === 'hi' ? 'अमनय' : 'Invalid',
        language === 'hi' ? 'आय 10 स 60 क बच हन चहए' : 'Age must be between 10 and 60'
      );
      return;
    }
    try {
      const profileData = { age: parseInt(profile.age) };
      if (profile.height && !isNaN(parseFloat(profile.height))) {
        profileData.height = parseFloat(profile.height);
      }
      if (profile.weight && !isNaN(parseFloat(profile.weight))) {
        profileData.weight = parseFloat(profile.weight);
      }
      await saveUserProfile(profileData);
      Alert.alert(t.success, t.profileSaved);
      setShowProfile(false);
      const score = await calculateHealthScore();
      setHealthScore(score);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSaveDailyLog = async () => {
    setIsLoading(true);
    try {
      const result = await logDailyHealth(dailyLog);
      Alert.alert(t.success, t.logSaved);
      setShowDailyLog(false);
      if (result && result.risk) {
        setRiskResult(result.risk);
      }
      const score = await calculateHealthScore();
      setHealthScore(score);
      await loadData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await syncPendingData();
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.warn('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAiInsight = async (entry, idx) => {
    if (aiInsights[idx]) return;
    setAiLoadingIdx(idx);
    try {
      const riskData = {
        level: entry.riskLevel || 'Unknown',
        score: entry.score || 0,
        mlConfidence: entry.confidence,
        healthGrade: entry.healthGrade,
        symptoms: entry.symptoms
          ? Object.fromEntries(entry.symptoms.map((s) => [s, true]))
          : {},
        emergency: entry.emergency
          ? Object.fromEntries(entry.emergency.map((s) => [s, true]))
          : {},
        details: entry.details || {},
      };
      const advice = await generateSymptomAdvice(riskData, language);
      setAiInsights((prev) => ({ ...prev, [idx]: advice }));
    } catch (e) {
      setAiInsights((prev) => ({
        ...prev,
        [idx]: language === 'hi' ? 'AI सलह उपलबध नह ह' : 'AI advice unavailable.',
      }));
    } finally {
      setAiLoadingIdx(null);
    }
  };

  const speakText = (text) => {
    try {
      Speech.speak(text, {
        language: language === 'hi' ? 'hi-IN' : 'en-US',
        rate: 0.9,
      });
    } catch (_) {}
  };

  const getRiskLabel = (level) => {
    switch (level) {
      case 'Low': return t.lowRisk;
      case 'Medium': return t.mediumRisk;
      case 'High': return t.highRisk;
      default: return t.unknownRisk;
    }
  };

  const visibleEntries = showAllSymptoms ? symptomEntries : symptomEntries.slice(0, 5);

  // -- Render --
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E91E63']} tintColor="#E91E63" />}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t.pageTitle}</Text>
            <Text style={styles.subtitle}>{t.pageSubtitle}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => setShowProfile(!showProfile)}>
            <User size={20} color="#C2185B" />
          </TouchableOpacity>
        </View>

        {/* Health Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreAccent} />
          <View style={styles.scoreContent}>
            <View style={styles.scoreTop}>
              <View style={styles.scoreIconCircle}>
                <Heart size={22} color="#FFF" />
              </View>
              <Text style={styles.scoreTitle}>{t.healthScore}</Text>
            </View>

            {healthScore && healthScore.score !== null ? (
              <>
                <View style={styles.scoreMain}>
                  <Text style={styles.scoreValue}>{healthScore.score}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreBarFill, { width: `${Math.min(100, healthScore.score)}%`, backgroundColor: healthScore.score >= 70 ? '#4CAF50' : healthScore.score >= 40 ? '#FFA726' : '#EF5350' }]} />
                </View>
                <View style={styles.scoreBreakdown}>
                  <View style={styles.scoreItem}>
                    <Moon size={14} color="#9575CD" />
                    <Text style={styles.scoreItemLabel} numberOfLines={1}>{t.sleepScore}</Text>
                    <Text style={styles.scoreItemValue}>{healthScore.breakdown?.sleep || 0}</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Brain size={14} color="#EF5350" />
                    <Text style={styles.scoreItemLabel} numberOfLines={1}>{t.stressScore}</Text>
                    <Text style={styles.scoreItemValue}>{healthScore.breakdown?.stress || 0}</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Dumbbell size={14} color="#26A69A" />
                    <Text style={styles.scoreItemLabel} numberOfLines={1}>{t.exerciseScore}</Text>
                    <Text style={styles.scoreItemValue}>{healthScore.breakdown?.exercise || 0}</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <TrendingUp size={14} color="#42A5F5" />
                    <Text style={styles.scoreItemLabel} numberOfLines={1}>{t.bmiScore}</Text>
                    <Text style={styles.scoreItemValue}>{healthScore.breakdown?.bmi || 0}</Text>
                  </View>
                </View>
                {healthScore.days_logged > 0 && (
                  <Text style={styles.daysLoggedText}>
                    {healthScore.days_logged} {t.daysLogged}
                  </Text>
                )}
                {healthScore.days_logged === 0 && (
                  <Text style={styles.daysLoggedText}>
                    {language === 'hi' ? 'डिफ़ॉल्ट मान • अधिक सटीकता के लिए दैनिक लॉग करें' : 'Default values • Log daily for better accuracy'}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.noDataText}>{t.noScoreYet}</Text>
            )}
          </View>
        </View>

        {/* Last Risk Assessment */}
        <View style={styles.sectionHeader}>
          <Activity size={18} color="#C2185B" />
          <Text style={styles.sectionTitle}>{t.lastAssessment}</Text>
        </View>

        {riskResult && riskResult.risk_level !== 'Error' ? (
          <View style={[styles.riskCard, { borderLeftColor: getRiskColor(riskResult.risk_level) }]}>
            <View style={styles.riskRow}>
              {getRiskIcon(riskResult.risk_level, 32)}
              <View style={styles.riskInfo}>
                <Text style={styles.riskLevelLabel}>{t.riskLevel}</Text>
                <Text style={[styles.riskLevelValue, { color: getRiskColor(riskResult.risk_level) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {getRiskLabel(riskResult.risk_level)}
                </Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round((riskResult.confidence || 0) * 100)}%
                </Text>
                <Text style={styles.confidenceLabel} numberOfLines={1}>{t.confidence}</Text>
              </View>
            </View>

            {riskResult.recommendation_key && (
              <View style={styles.recommendationBox}>
                <Text style={styles.recommendationText}>
                  {globalT[riskResult.recommendation_key] || riskResult.recommendation_key}
                </Text>
                <TouchableOpacity
                  style={styles.speakBtn}
                  onPress={() => speakText(globalT[riskResult.recommendation_key] || riskResult.recommendation_key)}
                >
                  <Volume2 size={18} color="#C2185B" />
                </TouchableOpacity>
              </View>
            )}

            {riskResult.source && (
              <View style={styles.sourceTag}>
                <Text style={styles.sourceTagText}>
                  {riskResult.source === 'ml_api' ? t.mlPowered
                    : riskResult.source === 'local_fallback' ? t.offlineAnalysis
                    : t.ruleBased}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Activity size={32} color="#BDBDBD" />
            <Text style={styles.emptyText}>{t.noAssessment}</Text>
          </View>
        )}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleCheckRisk} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Activity size={16} color="#FFF" />
                <Text style={styles.actionBtnPrimaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t.runAssessment}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => router.push('/symptoms')}>
            <Clipboard size={16} color="#C2185B" />
            <Text style={styles.actionBtnSecondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t.fullCheckup}</Text>
          </TouchableOpacity>
        </View>

        {/* Symptom History */}
        <View style={styles.sectionHeader}>
          <FileText size={18} color="#C2185B" />
          <Text style={styles.sectionTitle}>{t.symptomHistory}</Text>
          {symptomEntries.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{symptomEntries.length}</Text>
            </View>
          )}
        </View>

        {symptomEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Pill size={32} color="#BDBDBD" />
            <Text style={styles.emptyText}>{t.noSymptoms}</Text>
          </View>
        ) : (
          <>
            {visibleEntries.map((entry, idx) => (
              <View key={idx} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyDateRow}>
                    <Clock size={12} color="#999" />
                    <Text style={styles.historyDate} numberOfLines={1}>
                      {formatRelativeDate(entry.date, t)} {'\u2022'} {new Date(entry.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.historyRiskBadge, { backgroundColor: getRiskColor(entry.riskLevel) + '18' }]}>
                    {getRiskIcon(entry.riskLevel, 12)}
                    <Text style={[styles.historyRiskText, { color: getRiskColor(entry.riskLevel) }]} numberOfLines={1}>
                      {getRiskLabel(entry.riskLevel)}
                    </Text>
                  </View>
                </View>

                {entry.symptoms && entry.symptoms.length > 0 && (
                  <View style={styles.symptomChipRow}>
                    {entry.symptoms.map((sym) => (
                      <View key={sym} style={styles.symptomChip}>
                        <Text style={styles.symptomChipText}>{symLabels[sym] || sym}</Text>
                      </View>
                    ))}
                    {entry.emergency && entry.emergency.length > 0 && entry.emergency.map((em) => (
                      <View key={em} style={[styles.symptomChip, styles.emergencyChip]}>
                        <Text style={[styles.symptomChipText, styles.emergencyChipText]}>{symLabels[em] || em}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {entry.details && (
                  <View style={styles.detailRow}>
                    {entry.details.painIntensity ? (
                      <Text style={styles.detailText}>Pain: {entry.details.painIntensity}/10</Text>
                    ) : null}
                    {entry.details.bleedingLevel ? (
                      <Text style={styles.detailText}>Bleeding: {entry.details.bleedingLevel}</Text>
                    ) : null}
                    {entry.details.fatigueLevel ? (
                      <Text style={styles.detailText}>Fatigue: {entry.details.fatigueLevel}</Text>
                    ) : null}
                  </View>
                )}

                <View style={styles.historyMeta}>
                  {entry.confidence && (
                    <Text style={styles.metaText}>{t.confidence}: {Math.round((entry.confidence || 0) * 100)}%</Text>
                  )}
                  {entry.source && (
                    <View style={styles.miniSourceTag}>
                      <Text style={styles.miniSourceText}>
                        {entry.source === 'ml_api' ? 'ML' : entry.source === 'local_fallback' ? 'Offline' : 'Rule'}
                      </Text>
                    </View>
                  )}
                </View>

                {entry.type === 'symptom_check' && (
                  <View style={styles.aiSection}>
                    {aiInsights[idx] ? (
                      <View style={styles.aiInsightBox}>
                        <TouchableOpacity
                          style={styles.aiInsightHeader}
                          onPress={() => setCollapsedInsights((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                          activeOpacity={0.7}
                        >
                          <Sparkles size={14} color="#C2185B" />
                          <Text style={styles.aiInsightLabel}>{t.aiInsight}</Text>
                          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity onPress={() => speakText(aiInsights[idx])}>
                              <Volume2 size={16} color="#C2185B" />
                            </TouchableOpacity>
                            {collapsedInsights[idx] ? (
                              <ChevronDown size={16} color="#C2185B" />
                            ) : (
                              <ChevronUp size={16} color="#C2185B" />
                            )}
                          </View>
                        </TouchableOpacity>
                        {!collapsedInsights[idx] && (
                          <Text style={styles.aiInsightText}>{aiInsights[idx]}</Text>
                        )}
                      </View>
                    ) : aiLoadingIdx === idx ? (
                      <View style={styles.aiLoadingRow}>
                        <ActivityIndicator size="small" color="#C2185B" />
                        <Text style={styles.aiLoadingText}>{t.loadingAI}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.aiInsightBtn} onPress={() => handleGetAiInsight(entry, idx)}>
                        <Sparkles size={14} color="#C2185B" />
                        <Text style={styles.aiInsightBtnText}>{t.getAiInsight}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {symptomEntries.length > 5 && (
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowAllSymptoms(!showAllSymptoms)}>
                <Text style={styles.viewAllBtnText}>{showAllSymptoms ? t.viewLess : t.viewAll}</Text>
                {showAllSymptoms ? <ChevronUp size={16} color="#C2185B" /> : <ChevronDown size={16} color="#C2185B" />}
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Quick Daily Log */}
        <View style={styles.sectionHeader}>
          <Clipboard size={18} color="#C2185B" />
          <Text style={styles.sectionTitle}>{t.dailyLog}</Text>
          <TouchableOpacity onPress={() => setShowDailyLog(!showDailyLog)} style={{ marginLeft: 'auto' }}>
            {showDailyLog ? <ChevronUp size={18} color="#999" /> : <ChevronDown size={18} color="#999" />}
          </TouchableOpacity>
        </View>

        {showDailyLog && (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>{t.stressLevel} (1-5)</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.levelChip, dailyLog.stress_level === val && styles.levelChipActive]}
                  onPress={() => setDailyLog({ ...dailyLog, stress_level: val })}
                >
                  <Text style={[styles.levelChipText, dailyLog.stress_level === val && styles.levelChipTextActive]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>{t.sleepHours}</Text>
            <TextInput
              style={styles.formInput}
              value={dailyLog.sleep_hours.toString()}
              onChangeText={(val) => setDailyLog({ ...dailyLog, sleep_hours: parseFloat(val) || 0 })}
              keyboardType="numeric"
              placeholder="7"
            />

            <Text style={styles.formLabel}>{t.exerciseMin}</Text>
            <TextInput
              style={styles.formInput}
              value={dailyLog.exercise_minutes.toString()}
              onChangeText={(val) => setDailyLog({ ...dailyLog, exercise_minutes: parseInt(val) || 0 })}
              keyboardType="numeric"
              placeholder="30"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDailyLog} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{t.saveLog}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Editor */}
        {showProfile && (
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>{t.healthProfile}</Text>

            <Text style={styles.formLabel}>{t.age}</Text>
            <TextInput
              style={styles.formInput}
              value={profile.age}
              onChangeText={(val) => setProfile({ ...profile, age: val })}
              keyboardType="numeric"
              placeholder="25"
            />

            <Text style={styles.formLabel}>{t.height}</Text>
            <TextInput
              style={styles.formInput}
              value={profile.height}
              onChangeText={(val) => setProfile({ ...profile, height: val })}
              keyboardType="numeric"
              placeholder="165"
            />

            <Text style={styles.formLabel}>{t.weight}</Text>
            <TextInput
              style={styles.formInput}
              value={profile.weight}
              onChangeText={(val) => setProfile({ ...profile, weight: val })}
              keyboardType="numeric"
              placeholder="55"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveBtnText}>{t.saveProfile}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sync Status */}
        {syncStatus && (
          <View style={styles.syncCard}>
            <View style={styles.syncRow}>
              <RefreshCw size={14} color="#999" />
              <Text style={styles.syncTitle}>{t.syncStatus}</Text>
              <View style={[styles.syncDot, { backgroundColor: syncStatus.isOnline ? '#4CAF50' : '#FF5722' }]} />
              <Text style={styles.syncStatusText}>{syncStatus.isOnline ? t.online : t.offline}</Text>
              <TouchableOpacity onPress={handleSync} style={styles.syncBtn}>
                <Text style={styles.syncBtnText}>{t.syncNow}</Text>
              </TouchableOpacity>
            </View>
            {syncStatus.pendingCount > 0 && (
              <Text style={styles.syncPending}>{t.pendingSync}: {syncStatus.pendingCount}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  scoreAccent: {
    height: 4,
    backgroundColor: '#E91E63',
  },
  scoreContent: {
    padding: 20,
  },
  scoreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  scoreMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#E91E63',
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCC',
    marginLeft: 4,
  },
  scoreBar: {
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scoreBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 2,
  },
  scoreItemLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  scoreItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555',
    marginTop: 2,
  },
  daysLoggedText: {
    fontSize: 11,
    color: '#BBB',
    textAlign: 'center',
    marginTop: 10,
  },
  noDataText: {
    fontSize: 13,
    color: '#BBB',
    textAlign: 'center',
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1,
  },
  riskCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  riskLevelLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskLevelValue: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  confidenceBadge: {
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
  },
  confidenceLabel: {
    fontSize: 10,
    color: '#BBB',
  },
  recommendationBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
  },
  speakBtn: {
    padding: 4,
    marginLeft: 8,
  },
  sourceTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#BBB',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    gap: 6,
    overflow: 'hidden',
  },
  actionBtnPrimaryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#E91E63',
    gap: 6,
    overflow: 'hidden',
  },
  actionBtnSecondaryText: {
    color: '#C2185B',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
  },
  countBadge: {
    backgroundColor: '#E91E63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    marginRight: 8,
  },
  historyDate: {
    fontSize: 11,
    color: '#999',
    flexShrink: 1,
  },
  historyRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  historyRiskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  symptomChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  symptomChip: {
    backgroundColor: '#FFE4E9',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  symptomChipText: {
    fontSize: 11,
    color: '#C2185B',
    fontWeight: '600',
  },
  emergencyChip: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  emergencyChipText: {
    color: '#D32F2F',
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 11,
    color: '#888',
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 11,
    color: '#BBB',
  },
  miniSourceTag: {
    backgroundColor: '#EEF2FF',
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  miniSourceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366F1',
  },
  aiSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 10,
  },
  aiInsightBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE4E9',
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aiInsightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2185B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiInsightText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLoadingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  aiInsightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB6C1',
    alignSelf: 'flex-start',
  },
  aiInsightBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C2185B',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginBottom: 10,
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C2185B',
  },
  formCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#FFE4E9',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E9',
  },
  levelChipActive: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  levelChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  levelChipTextActive: {
    color: '#FFF',
  },
  saveBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  syncCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  syncTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncStatusText: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },
  syncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFE4E9',
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C2185B',
  },
  syncPending: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    marginLeft: 20,
  },
});
