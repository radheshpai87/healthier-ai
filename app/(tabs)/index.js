import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Heart,
  Calendar,
  MessageCircle,
  Activity,
  Shield,
  Sparkles,
  Moon,
  Sun,
  Flower2,
  ChevronRight,
  TrendingUp,
  Stethoscope,
} from 'lucide-react-native';
import LanguageSwitch from '../../src/components/LanguageSwitch';
import { useLanguage } from '../../src/context/LanguageContext';
import { translations } from '../../src/constants/translations';
import { getPeriodData } from '../../src/utils/storage';
import { getRole } from '../../src/services/storageService';
import { getUserProfile } from '../../src/services/HealthDataLogger';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { language } = useLanguage();
  const t = translations[language];
  const router = useRouter();
  
  const [greeting, setGreeting] = useState('');
  const [cycleDay, setCycleDay] = useState(null);
  const [nextPeriodDays, setNextPeriodDays] = useState(null);
  const [todayTip, setTodayTip] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setGreetingMessage();
      setDailyTip();
      await Promise.all([loadCycleInfo(), loadRole(), checkProfile()]);
      setIsLoading(false);
    };
    init();
  }, [language]);

  const checkProfile = async () => {
    try {
      const profile = await getUserProfile();
      setHasProfile(!!(profile && profile.age));
    } catch (e) {
      setHasProfile(false);
    }
  };

  const loadRole = async () => {
    try {
      const role = await getRole();
      setUserRole(role);
    } catch (e) {
      console.warn('[Home] Failed to load role:', e);
    }
  };

  const setGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(language === 'hi' ? 'सुप्रभात! 🌅' : 'Good Morning! 🌅');
    } else if (hour < 17) {
      setGreeting(language === 'hi' ? 'नमस्ते! ☀️' : 'Good Afternoon! ☀️');
    } else {
      setGreeting(language === 'hi' ? 'शुभ संध्या! 🌙' : 'Good Evening! 🌙');
    }
  };

  const loadCycleInfo = async () => {
    try {
      const periodDates = await getPeriodData();
      if (periodDates && periodDates.length > 0) {
        const sortedDates = periodDates.sort((a, b) => new Date(b) - new Date(a));
        const lastPeriod = new Date(sortedDates[0]);
        const today = new Date();
        const diffTime = today - lastPeriod;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setCycleDay(diffDays);
        
        // Use saved cycle length from profile, default to 28
        let avgCycle = 28;
        try {
          const profile = await getUserProfile();
          if (profile && profile.avgCycleLength) {
            avgCycle = profile.avgCycleLength;
          }
        } catch (_) {}
        const nextPeriod = avgCycle - diffDays;
        setNextPeriodDays(nextPeriod > 0 ? nextPeriod : 0);
      }
    } catch (error) {
      console.error('Error loading cycle info:', error);
    }
  };

  const setDailyTip = () => {
    const tips = language === 'hi' ? [
      '💧 आज खूब पानी पिएं - हाइड्रेशन जरूरी है!',
      '🧘 5 मिनट गहरी सांस लें - तनाव कम होगा।',
      '🚶‍♀️ थोड़ा चलें - शरीर और मन दोनों को फायदा।',
      '😴 आज रात जल्दी सोने की कोशिश करें।',
      '🥗 हरी सब्जियां खाएं - आयरन जरूरी है।',
      '💆 खुद के लिए कुछ अच्छा करें आज!',
    ] : [
      '💧 Stay hydrated today - drink plenty of water!',
      '🧘 Take 5 minutes for deep breathing - reduce stress.',
      '🚶‍♀️ Take a short walk - benefits body and mind.',
      '😴 Try to get to bed early tonight.',
      '🥗 Eat leafy greens - iron is important!',
      '💆 Do something nice for yourself today!',
    ];
    
    const dayIndex = new Date().getDate() % tips.length;
    setTodayTip(tips[dayIndex]);
  };

  const getCyclePhase = () => {
    if (!cycleDay) return null;
    
    if (cycleDay <= 5) {
      return {
        phase: language === 'hi' ? 'मासिक धर्म' : 'Menstrual',
        icon: <Moon size={20} color="#FF6B6B" />,
        color: '#FF6B6B',
        tip: language === 'hi' ? 'आराम करें और गर्म पानी पिएं' : 'Rest and stay warm',
      };
    } else if (cycleDay <= 13) {
      return {
        phase: language === 'hi' ? 'फॉलिक्युलर' : 'Follicular',
        icon: <Flower2 size={20} color="#4CAF50" />,
        color: '#4CAF50',
        tip: language === 'hi' ? 'ऊर्जा बढ़ रही है - नई चीजें ट्राई करें!' : 'Energy rising - try new things!',
      };
    } else if (cycleDay <= 16) {
      return {
        phase: language === 'hi' ? 'ओव्यूलेशन' : 'Ovulation',
        icon: <Sun size={20} color="#FFB6C1" />,
        color: '#FFB6C1',
        tip: language === 'hi' ? 'सबसे ज्यादा ऊर्जा - सोशल रहें!' : 'Peak energy - be social!',
      };
    } else {
      return {
        phase: language === 'hi' ? 'ल्यूटियल' : 'Luteal',
        icon: <Sparkles size={20} color="#9C27B0" />,
        color: '#9C27B0',
        tip: language === 'hi' ? 'सेल्फ-केयर पर ध्यान दें' : 'Focus on self-care',
      };
    }
  };

  const quickActions = [
    {
      id: 'symptoms',
      title: language === 'hi' ? 'जोखिम जांच' : 'Risk Check',
      subtitle: language === 'hi' ? 'लक्षण दर्ज करें' : 'Log symptoms',
      icon: <Activity size={24} color="#FFF" />,
      color: '#E91E63',
      onPress: () => router.push('/symptoms'),
    },
    {
      id: 'calendar',
      title: language === 'hi' ? 'कैलेंडर' : 'Calendar',
      subtitle: language === 'hi' ? 'पीरियड ट्रैक करें' : 'Track periods',
      icon: <Calendar size={24} color="#FFF" />,
      color: '#FF6B6B',
      onPress: () => router.push('/calendar'),
    },
    {
      id: 'chat',
      title: language === 'hi' ? 'AI सहायक' : 'AI Chat',
      subtitle: language === 'hi' ? 'स्वास्थ्य सलाह' : 'Health advice',
      icon: <MessageCircle size={24} color="#FFF" />,
      color: '#4CAF50',
      onPress: () => router.push('/chat'),
    },
    {
      id: 'risk',
      title: language === 'hi' ? 'दैनिक स्वास्थ्य' : 'Daily Health',
      subtitle: language === 'hi' ? 'तनाव, नींद, व्यायाम' : 'Stress, sleep, exercise',
      icon: <TrendingUp size={24} color="#FFF" />,
      color: '#2196F3',
      onPress: () => router.push('/risk'),
    },
    // Show ASHA Dashboard for ASHA workers
    ...(userRole === 'asha' ? [{
      id: 'asha',
      title: language === 'hi' ? 'आशा डैशबोर्ड' : 'ASHA Dashboard',
      subtitle: language === 'hi' ? 'मरीज रिकॉर्ड' : 'Patient records',
      icon: <Stethoscope size={24} color="#FFF" />,
      color: '#9C27B0',
      onPress: () => router.push('/asha'),
    }] : []),
  ];

  const phase = getCyclePhase();

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFB6C1" />
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.appName}>{t.appName}</Text>
          </View>
          <LanguageSwitch />
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Heart size={32} color="#FFB6C1" fill="#FFB6C1" />
            <Text style={styles.heroTitle}>
              {language === 'hi' ? 'आपका स्वास्थ्य साथी' : 'Your Health Companion'}
            </Text>
          </View>
          
          {cycleDay ? (
            <View style={styles.cycleInfo}>
              <View style={styles.cycleDayBox}>
                <Text style={styles.cycleDayNumber}>{cycleDay}</Text>
                <Text style={styles.cycleDayLabel}>
                  {language === 'hi' ? 'दिन' : 'Day'}
                </Text>
              </View>
              
              {phase && (
                <View style={styles.phaseInfo}>
                  <View style={[styles.phaseBadge, { backgroundColor: phase.color + '20' }]}>
                    {phase.icon}
                    <Text style={[styles.phaseText, { color: phase.color }]}>{phase.phase}</Text>
                  </View>
                  <Text style={styles.phaseTip}>{phase.tip}</Text>
                </View>
              )}
              
              {nextPeriodDays !== null && nextPeriodDays > 0 && (
                <View style={styles.nextPeriodBox}>
                  <TrendingUp size={16} color="#FFB6C1" />
                  <Text style={styles.nextPeriodText}>
                    {language === 'hi' 
                      ? `अगला पीरियड ~${nextPeriodDays} दिन में`
                      : `Next period in ~${nextPeriodDays} days`
                    }
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noCycleInfo}>
              <Text style={styles.noCycleText}>
                {language === 'hi' 
                  ? 'अपना पहला पीरियड लॉग करें 👇'
                  : 'Log your first period 👇'
                }
              </Text>
              <TouchableOpacity 
                style={styles.startButton}
                onPress={() => router.push('/calendar')}
              >
                <Calendar size={20} color="#FFF" />
                <Text style={styles.startButtonText}>
                  {language === 'hi' ? 'शुरू करें' : 'Get Started'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Profile Setup Prompt */}
        {!hasProfile && (
          <TouchableOpacity
            style={styles.profilePromptCard}
            onPress={() => router.push('/profile-setup')}
            activeOpacity={0.8}
          >
            <View style={styles.profilePromptContent}>
              <Stethoscope size={24} color="#FF6B6B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.profilePromptTitle}>
                  {language === 'hi' ? 'अपनी प्रोफ़ाइल पूरी करें' : 'Complete Your Profile'}
                </Text>
                <Text style={styles.profilePromptSubtitle}>
                  {language === 'hi'
                    ? 'बेहतर स्वास्थ्य जानकारी के लिए अपना विवरण दें'
                    : 'Add your details for better health insights'}
                </Text>
              </View>
              <ChevronRight size={20} color="#FF6B6B" />
            </View>
          </TouchableOpacity>
        )}

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <Sparkles size={20} color="#FFB6C1" />
          <Text style={styles.tipText}>{todayTip}</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>
          {language === 'hi' ? 'त्वरित कार्य' : 'Quick Actions'}
        </Text>
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={action.onPress}
            >
              {action.icon}
              <Text style={styles.actionTitle}>{action.title}</Text>
              <ChevronRight size={16} color="#FFF" style={styles.actionArrow} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy Badge */}
        <View style={styles.privacyBadge}>
          <Shield size={16} color="#4CAF50" />
          <Text style={styles.privacyText}>
            {language === 'hi' 
              ? 'आपका डेटा 100% सुरक्षित - सिर्फ आपके फोन पर'
              : 'Your data is 100% private - stays on your phone'
            }
          </Text>
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  heroCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#FFB6C1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  cycleInfo: {
    alignItems: 'center',
  },
  cycleDayBox: {
    alignItems: 'center',
    marginBottom: 15,
  },
  cycleDayNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFB6C1',
  },
  cycleDayLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: -5,
  },
  phaseInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseTip: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  nextPeriodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  nextPeriodText: {
    fontSize: 13,
    color: '#666',
  },
  noCycleInfo: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  noCycleText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 15,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB6C1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profilePromptCard: {
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: '#FFF0F0',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFB6C1',
    borderStyle: 'dashed',
  },
  profilePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 2,
  },
  profilePromptSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 15,
    borderRadius: 15,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  actionCard: {
    flex: 1,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  actionArrow: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.7,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 30,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    gap: 8,
  },
  privacyText: {
    fontSize: 12,
    color: '#4CAF50',
  },
});
