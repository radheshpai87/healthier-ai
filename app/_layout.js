/* PROJECT: "AuraHealth" - Menstrual Wellness & AI Companion 
GOAL: A privacy-first, vernacular-supported menstrual tracker for the CodeSangram Hackathon.
TECH STACK: React Native (Expo Go), Expo Router, Lucide Icons, Gemini API for health insights.

CORE FEATURES TO IMPLEMENT:
1. Cycle Tracker: A visual calendar using 'react-native-calendars' to log periods and symptoms.
2. AI Health Advocate: A chat interface integrating Gemini API for personalized health advice.
3. Vernacular First: Support for English and Malayalam (crucial for rural impact).
4. Privacy-First: All data stored locally using 'expo-secure-store'.

UI STYLE: Soft pastel theme (#FFF5F5, #FFB6C1), minimalist, accessible for rural users.
*/

import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { startAutoSync, stopAutoSync } from '../src/services/syncService';
import { getRole } from '../src/services/storageService';
import { restoreSession, getCurrentUserId } from '../src/services/authService';
import { ROLES } from '../src/utils/constants';

// ── Inner navigator — lives inside AuthProvider so it can use useAuth() ────
function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [userRole, setUserRole] = useState(undefined);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { refreshUser } = useAuth();

  const checkingRef = React.useRef(false);

  const refreshRole = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      // 1. Restore session (sets _currentUserId if valid, else null)
      const restoredUser = await restoreSession();
      // 2. Hydrate auth context with the now-known user
      await refreshUser();
      // 3. Only read role if a session exists — prevents legacy unscoped keys from leaking
      const sessionActive = !!getCurrentUserId();
      setHasSession(sessionActive);
      if (sessionActive) {
        const role = await getRole();
        setUserRole(role || null);
      } else {
        setUserRole(null);
      }
    } catch (e) {
      console.error('[Layout] Error checking role:', e);
      setHasSession(false);
      setUserRole(null);
    } finally {
      checkingRef.current = false;
      if (!isReady) setIsReady(true);
    }
  }, [isReady, refreshUser]);

  // Initial load
  useEffect(() => {
    refreshRole();
  }, []);

  // Re-check role on navigation (handles post-onboarding)
  useEffect(() => {
    if (isReady) refreshRole();
  }, [segments]);

  // Route guard
  useEffect(() => {
    if (!isReady || userRole === undefined) return;

    const currentScreen = segments[0];
    const onboardingScreens = ['login', 'role-select', 'profile-setup'];

    // No valid session → force to login (catches legacy data with no registered account)
    if (!hasSession) {
      if (!onboardingScreens.includes(currentScreen)) {
        router.replace('/login');
      }
      return;
    }

    if (!userRole) {
      if (!onboardingScreens.includes(currentScreen)) {
        router.replace('/login');
      }
    } else if (userRole === ROLES.ASHA) {
      const ashaAllowed = ['asha', 'role-select', 'symptoms', 'result'];
      if (!ashaAllowed.includes(currentScreen)) {
        router.replace('/asha');
      }
    }
  }, [isReady, userRole, hasSession, segments]);

  // Background sync
  useEffect(() => {
    startAutoSync();
    return () => stopAutoSync();
  }, []);

  if (!isReady) {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color="#FFB6C1" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFF5F5' },
          headerTintColor: '#333',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FFF5F5' },
        }}
      >
        <Stack.Screen name="role-select"   options={{ title: 'Select Role',     headerShown: false }} />
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="symptoms"      options={{ title: 'Health Assessment' }} />
        <Stack.Screen name="result"        options={{ title: 'Result', headerBackVisible: false }} />
        <Stack.Screen name="profile-setup" options={{ title: 'Profile Setup',   headerShown: false }} />
        <Stack.Screen name="asha"          options={{ title: 'ASHA Dashboard',  headerShown: false }} />
        <Stack.Screen name="login"         options={{ title: 'Login',           headerShown: false }} />
      </Stack>
    </LanguageProvider>
  );
}

// ── Root layout — only wraps providers ────────────────────────────────────
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
});
