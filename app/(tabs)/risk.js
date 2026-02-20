import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
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
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { useLanguage } from '../../src/context/LanguageContext';
import { translations } from '../../src/constants/translations';
import {
  performRiskAssessment,
  getUserProfile,
  saveUserProfile,
  logDailyHealth,
  calculateHealthScore,
  getRiskHistory,
} from '../../src/services/HealthDataLogger';
import { getSyncStatus, syncPendingData } from '../../src/services/syncService';
import VoiceAlert from '../../src/components/VoiceAlert';

export default function RiskScreen() {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [isLoading, setIsLoading] = useState(false);
  const [riskResult, setRiskResult] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showVoiceAlert, setShowVoiceAlert] = useState(false);
  
  // Profile form
  const [profile, setProfile] = useState({
    age: '',
    height: '',
    weight: '',
  });
  
  // Daily log form
  const [dailyLog, setDailyLog] = useState({
    stress_level: 3,
    sleep_hours: 7,
    exercise_minutes: 30,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load profile
      const savedProfile = await getUserProfile();
      if (savedProfile) {
        setProfile({
          age: savedProfile.age?.toString() || '',
          height: savedProfile.height?.toString() || '',
          weight: savedProfile.weight?.toString() || '',
        });
      }
      
      // Load health score
      const score = await calculateHealthScore();
      setHealthScore(score);
      
      // Load last risk assessment
      const history = await getRiskHistory();
      if (history.length > 0) {
        setRiskResult(history[history.length - 1]);
      }
      
      // Load sync status
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleCheckRisk = async () => {
    // Ensure profile exists before running assessment
    const currentProfile = await getUserProfile();
    if (!currentProfile || !currentProfile.age) {
      Alert.alert(
        language === 'hi' ? 'प्रोफ़ाइल आवश्यक' : 'Profile Required',
        language === 'hi'
          ? 'कृपया पहले स्वास्थ्य प्रोफ़ाइल भरें (आयु, ऊंचाई, वजन)।'
          : 'Please fill your Health Profile first (age, height, weight).',
        [
          { text: t.cancel || 'Cancel', style: 'cancel' },
          {
            text: language === 'hi' ? 'प्रोफ़ाइल भरें' : 'Fill Profile',
            onPress: () => setShowProfile(true),
          },
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await performRiskAssessment(dailyLog);
      setRiskResult(result);
      
      // Show voice alert for Medium or High risk
      if (result.risk_level === 'Medium' || result.risk_level === 'High') {
        setShowVoiceAlert(true);
      }
      
      // Update health score
      const score = await calculateHealthScore();
      setHealthScore(score);
      
      // Update sync status
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.age) {
      Alert.alert(
        language === 'hi' ? 'आवश्यक' : 'Required',
        language === 'hi' ? 'कृपया आयु दर्ज करें' : 'Please enter your age'
      );
      return;
    }

    const ageNum = parseInt(profile.age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 60) {
      Alert.alert(
        language === 'hi' ? 'अमान्य' : 'Invalid',
        language === 'hi' ? 'आयु 10 से 60 के बीच होनी चाहिए' : 'Age must be between 10 and 60'
      );
      return;
    }
    
    try {
      const profileData = {
        age: parseInt(profile.age),
      };
      if (profile.height && !isNaN(parseFloat(profile.height))) {
        profileData.height = parseFloat(profile.height);
      }
      if (profile.weight && !isNaN(parseFloat(profile.weight))) {
        profileData.weight = parseFloat(profile.weight);
      }
      await saveUserProfile(profileData);
      Alert.alert(t.success, t.profileSaved);
      setShowProfile(false);
      
      // Refresh health score after profile save
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
      
      // Update display with the risk result returned by logDailyHealth
      // (it already ran performRiskAssessment internally — no need to call again)
      if (result && result.risk) {
        setRiskResult(result.risk);
      }
      // Refresh health score
      const score = await calculateHealthScore();
      setHealthScore(score);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const result = await syncPendingData();
      const status = await getSyncStatus();
      setSyncStatus(status);
      
      if (result.synced > 0) {
        Alert.alert(t.success, `Synced ${result.synced} items`);
      } else if (!result.isOnline) {
        Alert.alert('Info', language === 'hi' ? 'ऑफलाइन - बाद में सिंक होगा' : 'Offline - will sync later');
      } else {
        Alert.alert('Info', language === 'hi' ? 'कोई डेटा सिंक नहीं' : 'No data to sync');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const speakRecommendation = (key) => {
    const text = t[key] || key;
    try {
      Speech.speak(text, {
        language: language === 'hi' ? 'hi-IN' : 'en-US',
        rate: 0.9,
      });
    } catch (e) {
      // TTS not available — silently ignore
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low': return '#4CAF50';
      case 'Medium': return '#FFC107';
      case 'High': return '#FF5722';
      default: return '#999';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'Low': return <CheckCircle size={32} color="#4CAF50" />;
      case 'Medium': return <AlertCircle size={32} color="#FFC107" />;
      case 'High': return <AlertTriangle size={32} color="#FF5722" />;
      default: return <Activity size={32} color="#999" />;
    }
  };

  const getRiskLabel = (level) => {
    switch (level) {
      case 'Low': return t.lowRisk;
      case 'Medium': return t.mediumRisk;
      case 'High': return t.highRisk;
      default: return t.unknownRisk;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Voice Alert Overlay */}
      {riskResult && (
        <VoiceAlert
          visible={showVoiceAlert}
          riskLevel={riskResult.risk_level}
          recommendationKey={riskResult.recommendation_key}
          onDismiss={() => setShowVoiceAlert(false)}
          autoSpeak={riskResult.risk_level === 'High'}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.riskAssessment}</Text>
        </View>

        {/* Health Score Card */}
        {healthScore && healthScore.score !== null && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>{t.healthScore}</Text>
            <Text style={styles.scoreValue}>{healthScore.score}</Text>
            <View style={styles.scoreBreakdown}>
              <View style={styles.scoreItem}>
                <Moon size={16} color="#FFB6C1" />
                <Text style={styles.scoreItemText}>{t.sleepScore}: {healthScore.breakdown?.sleep || 0}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Brain size={16} color="#FFB6C1" />
                <Text style={styles.scoreItemText}>{t.stressScore}: {healthScore.breakdown?.stress || 0}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Dumbbell size={16} color="#FFB6C1" />
                <Text style={styles.scoreItemText}>{t.exerciseScore}: {healthScore.breakdown?.exercise || 0}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Risk Result Card */}
        {riskResult && riskResult.risk_level !== 'Error' && (
          <View style={[styles.riskCard, { borderLeftColor: getRiskColor(riskResult.risk_level) }]}>
            <View style={styles.riskHeader}>
              {getRiskIcon(riskResult.risk_level)}
              <View style={styles.riskInfo}>
                <Text style={styles.riskLabel}>{t.riskLevel}</Text>
                <Text style={[styles.riskLevel, { color: getRiskColor(riskResult.risk_level) }]}>
                  {getRiskLabel(riskResult.risk_level)}
                </Text>
              </View>
              <Text style={styles.confidence}>{Math.round((riskResult.confidence || 0) * 100)}%</Text>
            </View>
            
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationText}>
                {t[riskResult.recommendation_key] || riskResult.recommendation_key}
              </Text>
              <TouchableOpacity
                style={styles.speakButton}
                onPress={() => speakRecommendation(riskResult.recommendation_key)}
              >
                <Volume2 size={20} color="#FFB6C1" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowProfile(!showProfile)}
          >
            <User size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>{t.healthProfile}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowDailyLog(!showDailyLog)}
          >
            <Activity size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>{t.dailyLog}</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Form */}
        {showProfile && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t.healthProfile}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.age}</Text>
              <TextInput
                style={styles.input}
                value={profile.age}
                onChangeText={(val) => setProfile({ ...profile, age: val })}
                keyboardType="numeric"
                placeholder="25"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.height}</Text>
              <TextInput
                style={styles.input}
                value={profile.height}
                onChangeText={(val) => setProfile({ ...profile, height: val })}
                keyboardType="numeric"
                placeholder="165"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.weight}</Text>
              <TextInput
                style={styles.input}
                value={profile.weight}
                onChangeText={(val) => setProfile({ ...profile, weight: val })}
                keyboardType="numeric"
                placeholder="55"
              />
            </View>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>{t.saveProfile}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Daily Log Form */}
        {showDailyLog && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t.dailyLog}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.stressLevel} (1-5)</Text>
              <View style={styles.sliderRow}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelButton,
                      dailyLog.stress_level === level && styles.levelButtonActive,
                    ]}
                    onPress={() => setDailyLog({ ...dailyLog, stress_level: level })}
                  >
                    <Text style={[
                      styles.levelButtonText,
                      dailyLog.stress_level === level && styles.levelButtonTextActive,
                    ]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.sleepHours}</Text>
              <TextInput
                style={styles.input}
                value={dailyLog.sleep_hours.toString()}
                onChangeText={(val) => setDailyLog({ ...dailyLog, sleep_hours: parseFloat(val) || 0 })}
                keyboardType="numeric"
                placeholder="7"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t.exerciseMinutes}</Text>
              <TextInput
                style={styles.input}
                value={dailyLog.exercise_minutes.toString()}
                onChangeText={(val) => setDailyLog({ ...dailyLog, exercise_minutes: parseInt(val) || 0 })}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveDailyLog}>
              <Text style={styles.saveButtonText}>{t.saveLog}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Check Risk Button */}
        <TouchableOpacity
          style={styles.checkButton}
          onPress={handleCheckRisk}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Activity size={24} color="#FFF" />
              <Text style={styles.checkButtonText}>{t.checkRisk}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sync Status */}
        {syncStatus && (
          <View style={styles.syncCard}>
            <View style={styles.syncHeader}>
              <Text style={styles.syncTitle}>{t.syncStatus}</Text>
              <View style={[styles.statusDot, { backgroundColor: syncStatus.isOnline ? '#4CAF50' : '#FF5722' }]} />
              <Text style={styles.statusText}>
                {syncStatus.isOnline ? t.online : t.offline}
              </Text>
            </View>
            
            {syncStatus.pendingCount > 0 && (
              <Text style={styles.pendingText}>
                {t.pendingSync}: {syncStatus.pendingCount} items
              </Text>
            )}
            
            {syncStatus.lastSync && (
              <Text style={styles.lastSyncText}>
                {t.lastSync}: {new Date(syncStatus.lastSync).toLocaleDateString()}
              </Text>
            )}
            
            <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
              <RefreshCw size={16} color="#FFB6C1" />
              <Text style={styles.syncButtonText}>{t.syncNow}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  scoreBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    gap: 15,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scoreItemText: {
    fontSize: 12,
    color: '#666',
  },
  riskCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskInfo: {
    flex: 1,
    marginLeft: 15,
  },
  riskLabel: {
    fontSize: 12,
    color: '#666',
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  confidence: {
    fontSize: 14,
    color: '#999',
  },
  recommendationBox: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  speakButton: {
    padding: 5,
    marginLeft: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFB6C1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  levelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#FFB6C1',
  },
  levelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  levelButtonTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#FFB6C1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  checkButton: {
    backgroundColor: '#FFB6C1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 15,
    gap: 10,
    marginBottom: 15,
  },
  checkButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  syncCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 15,
    marginBottom: 30,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  pendingText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 8,
    gap: 5,
  },
  syncButtonText: {
    color: '#FFB6C1',
    fontSize: 14,
  },
});
