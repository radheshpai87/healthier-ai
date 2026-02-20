/**
 * UserLoginScreen.js
 * ─────────────────────────────────────────────
 * Login screen that:
 *   1. Lists all registered users as avatar cards
 *   2. Tapping a card shows a 4-digit PIN pad
 *   3. "Add new user" navigates through onboarding
 *   4. If no users yet → shows only "Get Started"
 * ─────────────────────────────────────────────
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../context/LanguageContext';
import { getUsers, loginWithPin, logout } from '../services/authService';
import { useAuth } from '../context/AuthContext';

// ── Translations ───────────────────────────────
const t = {
  en: {
    title: 'AuraHealth',
    subtitle: 'Who is using the app?',
    getStarted: 'Get Started',
    addUser: '+ Add Another User',
    enterPin: 'Enter your 4-digit PIN',
    wrongPin: 'Incorrect PIN. Please try again.',
    back: '← Back',
    noUsers: 'No profiles yet.',
    noUsersHint: 'Create your first profile to get started.',
    delete: 'Delete',
  },
  hi: {
    title: 'AuraHealth',
    subtitle: 'ऐप कौन उपयोग कर रहा है?',
    getStarted: 'शुरू करें',
    addUser: '+ एक और उपयोगकर्ता जोड़ें',
    enterPin: 'अपना 4 अंक का PIN दर्ज करें',
    wrongPin: 'गलत PIN। कृपया पुनः प्रयास करें।',
    back: '← वापस',
    noUsers: 'अभी कोई प्रोफाइल नहीं है।',
    noUsersHint: 'शुरू करने के लिए पहली प्रोफाइल बनाएं।',
    delete: 'हटाएं',
  },
};

// ── PIN Pad ────────────────────────────────────
function PinPad({ onComplete, onCancel, label, errorMsg }) {
  const [pin, setPin] = useState('');
  const shakeAnim = new Animated.Value(0);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  useEffect(() => {
    if (errorMsg) {
      shake();
      setPin('');
    }
  }, [errorMsg]);

  const press = (digit) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) onComplete(next);
  };

  const del = () => setPin((p) => p.slice(0, -1));

  const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <View style={pinStyles.wrapper}>
      <Text style={pinStyles.label}>{label}</Text>

      {/* Dots */}
      <Animated.View style={[pinStyles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[pinStyles.dot, i < pin.length && pinStyles.dotFilled]}
          />
        ))}
      </Animated.View>

      {errorMsg ? <Text style={pinStyles.error}>{errorMsg}</Text> : null}

      {/* Keypad */}
      {KEYS.map((row, ri) => (
        <View key={ri} style={pinStyles.row}>
          {row.map((k, ci) => (
            <TouchableOpacity
              key={ci}
              style={[pinStyles.key, k === '' && pinStyles.keyInvisible]}
              onPress={() => (k === '⌫' ? del() : k !== '' ? press(k) : null)}
              disabled={k === ''}
            >
              <Text style={pinStyles.keyText}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ────────────────────────────────
export default function UserLoginScreen() {
  const router = useRouter();
  const { language } = useContext(LanguageContext);
  const lang = language === 'hi' ? 'hi' : 'en';
  const txt = t[lang];

  const { refreshUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    (async () => {
      const list = await getUsers();
      setUsers(list);
      setLoading(false);
    })();
  }, []);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setPinError('');
  };

  const handlePinComplete = async (pin) => {
    const { success } = await loginWithPin(selectedUser.id, pin);
    if (success) {
      await refreshUser();
      // Navigate to the appropriate home for the user's role
      if (selectedUser.role === 'asha') {
        router.replace('/asha');
      } else {
        router.replace('/(tabs)');
      }
    } else {
      setPinError(txt.wrongPin);
    }
  };

  const handleAddUser = async () => {
    // Log out the current session so profile-setup registers a fresh user
    await logout();
    router.replace('/role-select');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#C2185B" />
      </SafeAreaView>
    );
  }

  // ── PIN entry view ─────────────────────────
  if (selectedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedUser(null)}>
          <Text style={styles.backText}>{txt.back}</Text>
        </TouchableOpacity>

        {/* User avatar */}
        <View style={styles.avatarLarge}>
          <View style={[styles.avatarCircleLg, { backgroundColor: selectedUser.avatarColor || '#C2185B' }]}>
            <Text style={styles.avatarLetterLg}>
              {(selectedUser.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.selectedName}>{selectedUser.name}</Text>
        </View>

        <PinPad
          label={txt.enterPin}
          onComplete={handlePinComplete}
          onCancel={() => setSelectedUser(null)}
          errorMsg={pinError}
        />
      </SafeAreaView>
    );
  }

  // ── User list view ─────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>AH</Text>
        <Text style={styles.title}>{txt.title}</Text>
        <Text style={styles.subtitle}>{txt.subtitle}</Text>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{txt.noUsers}</Text>
          <Text style={styles.emptyHint}>{txt.noUsersHint}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAddUser}>
            <Text style={styles.primaryBtnText}>{txt.getStarted}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {users.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={styles.userCard}
                onPress={() => handleUserSelect(u)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatarCircle, { backgroundColor: u.avatarColor || '#C2185B' }]}>
                  <Text style={styles.avatarLetter}>
                    {(u.name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userName} numberOfLines={1}>{u.name}</Text>
                <Text style={styles.userRole}>
                  {u.role === 'asha' ? 'ASHA Worker' : 'Woman'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={handleAddUser}>
            <Text style={styles.addBtnText}>{txt.addUser}</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#C2185B',
    letterSpacing: -1,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#C2185B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 24,
    gap: 16,
  },
  userCard: {
    width: 130,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: '#C2185B',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    color: '#999',
  },
  addBtn: {
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C2185B',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#C2185B',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#C2185B',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // PIN view
  backBtn: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: {
    color: '#C2185B',
    fontSize: 15,
    fontWeight: '600',
  },
  avatarLarge: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarCircleLg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLetterLg: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  selectedName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
});

const pinStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingTop: 8,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C2185B',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#C2185B',
  },
  error: {
    color: '#E53935',
    fontSize: 13,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  keyInvisible: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#333',
  },
});
