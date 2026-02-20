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

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '../src/context/LanguageContext';
import { startAutoSync, stopAutoSync } from '../src/services/syncService';
import { getRole } from '../src/services/storageService';
import { ROLES } from '../src/utils/constants';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [userRole, setUserRole] = useState(undefined); // undefined = not yet checked
  const router = useRouter();
  const segments = useSegments();

  // Check role on mount and whenever segments change
  // Using a ref to debounce rapid segment changes
  const checkingRef = React.useRef(false);

  const refreshRole = React.useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const role = await getRole();
      setUserRole(role || null);
    } catch (e) {
      console.error('[Layout] Error checking role:', e);
      setUserRole(null);
    } finally {
      checkingRef.current = false;
      if (!isReady) setIsReady(true);
    }
  }, [isReady]);

  // Initial load
  useEffect(() => {
    refreshRole();
  }, []);

  // Re-check role on navigation (handles post-onboarding)
  useEffect(() => {
    if (isReady) refreshRole();
  }, [segments]);

  // Route guard: redirect based on role
  useEffect(() => {
    // Wait until role has been checked at least once
    if (!isReady || userRole === undefined) return;

    const currentScreen = segments[0];

    if (!userRole) {
      // No role set → send to role selection (unless already there or onboarding)
      const allowedWithoutRole = ['role-select', 'profile-setup'];
      if (!allowedWithoutRole.includes(currentScreen)) {
        router.replace('/role-select');
      }
    } else if (userRole === ROLES.ASHA) {
      // ASHA worker home is /asha, but allow assessment flow screens too
      const ashaAllowed = ['asha', 'role-select', 'symptoms', 'result'];
      if (!ashaAllowed.includes(currentScreen)) {
        router.replace('/asha');
      }
    }
    // Woman role → no forced redirect, any screen is fine
  }, [isReady, userRole, segments]);

  // Start background sync on app launch
  useEffect(() => {
    startAutoSync();
    return () => stopAutoSync();
  }, []);

  // Show splash loader while checking role
  if (!isReady) {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color="#FFB6C1" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FFF5F5',
            },
            headerTintColor: '#333',
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: '#FFF5F5',
            },
          }}
        >
          {/* Role selection (entry point for new users) */}
          <Stack.Screen
            name="role-select"
            options={{ title: 'Select Role', headerShown: false }}
          />
          {/* Main tabs */}
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
          {/* Symptom entry form */}
          <Stack.Screen
            name="symptoms"
            options={{ title: 'Health Assessment' }}
          />
          {/* Assessment result */}
          <Stack.Screen
            name="result"
            options={{ title: 'Result', headerBackVisible: false }}
          />
          {/* Woman profile setup (onboarding) */}
          <Stack.Screen
            name="profile-setup"
            options={{ title: 'Profile Setup', headerShown: false }}
          />
          {/* ASHA worker dashboard */}
          <Stack.Screen
            name="asha"
            options={{ title: 'ASHA Dashboard', headerShown: false }}
          />
        </Stack>
      </LanguageProvider>
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
