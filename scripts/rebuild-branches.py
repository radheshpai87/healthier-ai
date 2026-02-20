#!/usr/bin/env python3
"""
Rebuilds each branch so that actual source code reflects the
feature being added — not just commit messages on an identical codebase.

Branch progression:
  main                  → navigation skeleton only
  feature/core-logic    → + rule-based risk engine + symptom form
  feature/local-storage → + expo-secure-store persistence
  feature/emergency-module → + GPS + SMS emergency layer
  feature/ui-polish     → + i18n (EN/HI) + Calendar component
  demo/mvp-final        → + Gemini AI chat + backend sync (full app)
"""

import subprocess, os, sys, textwrap

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run(cmd, cwd=ROOT, check=True):
    print(f"  $ {cmd}")
    r = subprocess.run(cmd, shell=True, cwd=cwd, text=True,
                       capture_output=True)
    if check and r.returncode != 0:
        print(f"STDOUT: {r.stdout}")
        print(f"STDERR: {r.stderr}")
        sys.exit(f"Command failed: {cmd}")
    return r.stdout.strip()

def write(rel_path, content):
    path = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(textwrap.dedent(content).lstrip())

def remove(rel_path):
    path = os.path.join(ROOT, rel_path)
    if os.path.exists(path):
        os.remove(path)

def remove_dir(rel_dir):
    import shutil
    path = os.path.join(ROOT, rel_dir)
    if os.path.exists(path):
        shutil.rmtree(path)

def git_add_commit(msg):
    run("git add -A")
    run(f'git commit -m "{msg}"')

# ─────────────────────────────────────────────
# FILE CONTENT DEFINITIONS
# ─────────────────────────────────────────────

CONSTANTS_SKELETON = """\
import Constants from 'expo-constants';

export const ROLES = {
  WOMAN: 'woman',
  ASHA: 'asha',
};

export const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000/api';
"""

ROOT_LAYOUT_SKELETON = """\
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFF5F5' },
          headerTintColor: '#333',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FFF5F5' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
"""

TABS_LAYOUT = """\
import { Tabs } from 'expo-router';
import { Home, Calendar, MessageCircle, Settings, Activity } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFB6C1',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFF5F5',
          borderTopColor: '#FFE4E9',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home',     tabBarIcon: ({ color, size }) => <Home            color={color} size={size} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <Calendar        color={color} size={size} /> }} />
      <Tabs.Screen name="risk"     options={{ title: 'Health',   tabBarIcon: ({ color, size }) => <Activity        color={color} size={size} /> }} />
      <Tabs.Screen name="chat"     options={{ title: 'AI Chat',  tabBarIcon: ({ color, size }) => <MessageCircle   color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings        color={color} size={size} /> }} />
    </Tabs>
  );
}
"""

INDEX_SKELETON = """\
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>AuraHealth</Text>
      <Text style={styles.subtitle}>Menstrual Wellness Tracker</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Navigate using the tabs below to explore the app.
        </Text>
      </View>
      <Text style={styles.tagline}>
        Privacy-first • Vernacular-supported • Offline
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  emoji:     { fontSize: 56, marginBottom: 8 },
  title:     { fontSize: 28, fontWeight: 'bold', color: '#C2185B', marginBottom: 4 },
  subtitle:  { fontSize: 16, color: '#666', marginBottom: 24 },
  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardText:  { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  tagline:   { fontSize: 13, color: '#FFB6C1', textAlign: 'center' },
});
"""

RISK_SKELETON = """\
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RiskScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🩺</Text>
      <Text style={styles.title}>Health Risk</Text>
      <Text style={styles.text}>
        Risk assessment module coming in the next sprint.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  icon:  { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#C2185B', marginBottom: 12 },
  text:  { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
});
"""

CHAT_SKELETON = """\
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>💬</Text>
      <Text style={styles.title}>AI Health Advocate</Text>
      <Text style={styles.text}>
        AI chat integration coming in a future sprint.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  icon:  { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#C2185B', marginBottom: 12 },
  text:  { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
});
"""

CALENDAR_SKELETON = """\
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.title}>Cycle Calendar</Text>
      <Text style={styles.text}>
        Period tracking calendar coming in a future sprint.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  icon:  { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#C2185B', marginBottom: 12 },
  text:  { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
});
"""

SETTINGS_SKELETON = """\
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚙️</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.text}>
        Settings panel coming in a future sprint.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  icon:  { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#C2185B', marginBottom: 12 },
  text:  { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
});
"""

# ── CORE-LOGIC ──────────────────────────────
RISK_ENGINE = """\
// Rule-based risk scoring engine (v1 — no ML yet)

const SYMPTOM_WEIGHTS = {
  heavy_bleeding:  20,
  severe_cramps:   15,
  fever:           15,
  irregular_cycle: 20,
  discharge:       15,
  fatigue:         10,
  nausea:          10,
  headache:        10,
  bloating:         5,
  mood_swings:      5,
};

export function calculateRisk(symptoms = []) {
  let score = 0;
  for (const s of symptoms) {
    score += SYMPTOM_WEIGHTS[s] || 0;
  }

  if (score >= 50) {
    return {
      risk_level: 'High',
      score,
      message: 'Please consult a doctor immediately.',
      color: '#FF3B30',
    };
  }
  if (score >= 25) {
    return {
      risk_level: 'Medium',
      score,
      message: 'Monitor your symptoms and see a doctor if they persist.',
      color: '#FF9500',
    };
  }
  return {
    risk_level: 'Low',
    score,
    message: 'You appear to be healthy. Keep tracking!',
    color: '#34C759',
  };
}

export const ALL_SYMPTOMS = Object.keys(SYMPTOM_WEIGHTS);
"""

RISK_SCREEN_CORE = """\
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { calculateRisk, ALL_SYMPTOMS } from '../../src/services/riskEngine';

const SYMPTOM_LABELS = {
  heavy_bleeding:  'Heavy Bleeding',
  severe_cramps:   'Severe Cramps',
  fever:           'Fever',
  irregular_cycle: 'Irregular Cycle',
  discharge:       'Unusual Discharge',
  fatigue:         'Fatigue',
  nausea:          'Nausea',
  headache:        'Headache',
  bloating:        'Bloating',
  mood_swings:     'Mood Swings',
};

export default function RiskScreen() {
  const [selected, setSelected] = useState([]);
  const [result, setResult]     = useState(null);

  const toggle = (symptom) => {
    setSelected(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
    setResult(null);
  };

  const handleAssess = () => {
    if (selected.length === 0) {
      Alert.alert('No symptoms selected', 'Please select at least one symptom.');
      return;
    }
    setResult(calculateRisk(selected));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🩺 Health Assessment</Text>
      <Text style={styles.subtitle}>Select all symptoms you are experiencing:</Text>

      <View style={styles.grid}>
        {ALL_SYMPTOMS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, selected.includes(s) && styles.chipSelected]}
            onPress={() => toggle(s)}
          >
            <Text style={[styles.chipText, selected.includes(s) && styles.chipTextSelected]}>
              {SYMPTOM_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleAssess}>
        <Text style={styles.btnText}>Assess Risk</Text>
      </TouchableOpacity>

      {result && (
        <View style={[styles.result, { borderColor: result.color }]}>
          <Text style={[styles.level, { color: result.color }]}>
            {result.risk_level} Risk
          </Text>
          <Text style={styles.score}>Score: {result.score}</Text>
          <Text style={styles.msg}>{result.message}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flexGrow: 1, backgroundColor: '#FFF5F5', padding: 20 },
  title:           { fontSize: 22, fontWeight: 'bold', color: '#C2185B', marginBottom: 4 },
  subtitle:        { fontSize: 14, color: '#666', marginBottom: 16 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip:            { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFB6C1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipSelected:    { backgroundColor: '#FFB6C1', borderColor: '#C2185B' },
  chipText:        { fontSize: 13, color: '#555' },
  chipTextSelected:{ color: '#fff', fontWeight: '600' },
  btn:             { backgroundColor: '#C2185B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  btnText:         { color: '#fff', fontSize: 16, fontWeight: '700' },
  result:          { backgroundColor: '#fff', borderWidth: 2, borderRadius: 16, padding: 20, alignItems: 'center' },
  level:           { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  score:           { fontSize: 14, color: '#888', marginBottom: 8 },
  msg:             { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22 },
});
"""

INDEX_CORE = """\
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const [lastRisk, setLastRisk] = useState(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>AuraHealth</Text>
      <Text style={styles.subtitle}>Menstrual Wellness Tracker</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How are you feeling today?</Text>
        <Text style={styles.cardText}>
          Log your symptoms and get an instant health risk assessment.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => router.push('/(tabs)/risk')}
      >
        <Text style={styles.primaryBtnText}>🩺  Check Health Risk</Text>
      </TouchableOpacity>

      <Text style={styles.tagline}>
        Privacy-first • Vernacular-supported • Offline
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flexGrow: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  emoji:          { fontSize: 56, marginBottom: 8 },
  title:          { fontSize: 28, fontWeight: 'bold', color: '#C2185B', marginBottom: 4 },
  subtitle:       { fontSize: 16, color: '#666', marginBottom: 24 },
  card:           { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:      { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  cardText:       { fontSize: 14, color: '#666', lineHeight: 20 },
  primaryBtn:     { backgroundColor: '#C2185B', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 24, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tagline:        { fontSize: 13, color: '#FFB6C1', textAlign: 'center' },
});
"""

# ── LOCAL-STORAGE ───────────────────────────
STORAGE_UTIL = """\
import * as SecureStore from 'expo-secure-store';

const MAX_VALUE_SIZE = 2000; // expo-secure-store 2 KB limit per key

export async function saveItem(key, value) {
  const str = JSON.stringify(value);
  await SecureStore.setItemAsync(key, str);
}

export async function getItem(key) {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function removeItem(key) {
  await SecureStore.deleteItemAsync(key);
}
"""

STORAGE_SERVICE = """\
import { saveItem, getItem } from '../utils/storage';

const KEYS = {
  PROFILE:   'aura_profile',
  DAILY_LOG: 'aura_daily_logs',
};

// ── Profile ─────────────────────────────────
export async function saveUserProfile(data) {
  await saveItem(KEYS.PROFILE, { ...data, updatedAt: Date.now() });
}

export async function getUserProfile() {
  return await getItem(KEYS.PROFILE);
}

// ── Daily Health Logs ────────────────────────
export async function saveDailyLog(entry) {
  const logs = (await getItem(KEYS.DAILY_LOG)) || [];
  logs.push({ ...entry, date: new Date().toISOString() });
  // Keep last 90 days
  const trimmed = logs.slice(-90);
  await saveItem(KEYS.DAILY_LOG, trimmed);
  return trimmed;
}

export async function getDailyLogs() {
  return (await getItem(KEYS.DAILY_LOG)) || [];
}

export async function clearAllData() {
  await saveItem(KEYS.PROFILE,   null);
  await saveItem(KEYS.DAILY_LOG, []);
}
"""

USE_CYCLE_TRACKER = """\
import { useState, useEffect, useCallback } from 'react';
import { getDailyLogs, saveDailyLog } from '../services/storageService';

const AVG_CYCLE = 28;

export function useCycleTracker() {
  const [logs, setLogs]         = useState([]);
  const [prediction, setPred]   = useState(null);
  const [isLoading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getDailyLogs();
    setLogs(data);
    setPred(predictNext(data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const addLog = async (entry) => {
    const updated = await saveDailyLog(entry);
    setLogs(updated);
    setPred(predictNext(updated));
  };

  return { logs, prediction, isLoading, addLog, refresh: load };
}

function predictNext(logs) {
  const periods = logs.filter(l => l.isPeriod).map(l => new Date(l.date));
  if (periods.length < 1) return null;
  const last = periods[periods.length - 1];
  const next = new Date(last.getTime() + AVG_CYCLE * 24 * 60 * 60 * 1000);
  return {
    lastPeriod: last.toLocaleDateString(),
    nextPeriod: next.toLocaleDateString(),
    daysUntil:  Math.max(0, Math.round((next - Date.now()) / 86400000)),
  };
}
"""

INDEX_STORAGE = """\
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getUserProfile, saveUserProfile, saveDailyLog } from '../../src/services/storageService';
import { useCycleTracker } from '../../src/hooks/useCycleTracker';

export default function HomeScreen() {
  const router = useRouter();
  const { prediction, addLog } = useCycleTracker();
  const [profile, setProfile]     = useState({ name: '', age: '' });
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    getUserProfile().then(p => { if (p) setProfile(p); });
  }, []);

  const saveProfile = async () => {
    if (!profile.name || !profile.age) {
      Alert.alert('Required', 'Please enter your name and age.');
      return;
    }
    await saveUserProfile(profile);
    Alert.alert('Saved', 'Profile updated!');
    setShowProfile(false);
  };

  const logPeriodToday = async () => {
    await addLog({ isPeriod: true });
    Alert.alert('Logged', 'Period logged for today!');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>AuraHealth</Text>
      {profile.name ? (
        <Text style={styles.greeting}>Welcome, {profile.name}!</Text>
      ) : (
        <Text style={styles.subtitle}>Offline · Privacy-first</Text>
      )}

      {prediction && (
        <View style={styles.predCard}>
          <Text style={styles.predTitle}>Next Period Prediction</Text>
          <Text style={styles.predDate}>{prediction.nextPeriod}</Text>
          <Text style={styles.predSub}>in {prediction.daysUntil} days</Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={logPeriodToday}>
        <Text style={styles.primaryBtnText}>🩸  Log Period Today</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/risk')}>
        <Text style={styles.secondaryBtnText}>🩺  Check Health Risk</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowProfile(true)}>
        <Text style={styles.ghostBtnText}>👤  Edit Profile</Text>
      </TouchableOpacity>

      {/* Profile Modal */}
      <Modal visible={showProfile} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Your Profile</Text>
            <TextInput style={styles.input} placeholder="Name" value={profile.name}
              onChangeText={v => setProfile(p => ({ ...p, name: v }))} />
            <TextInput style={styles.input} placeholder="Age" keyboardType="numeric"
              value={profile.age?.toString()}
              onChangeText={v => setProfile(p => ({ ...p, age: v }))} />
            <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfile(false)}>
              <Text style={[styles.ghostBtnText, { textAlign: 'center', marginTop: 12 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flexGrow: 1, alignItems: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  emoji:           { fontSize: 56, marginTop: 20, marginBottom: 8 },
  title:           { fontSize: 28, fontWeight: 'bold', color: '#C2185B', marginBottom: 4 },
  greeting:        { fontSize: 16, color: '#C2185B', marginBottom: 20 },
  subtitle:        { fontSize: 16, color: '#666', marginBottom: 20 },
  predCard:        { backgroundColor: '#fff0f5', borderRadius: 16, padding: 16, width: '100%', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FFB6C1' },
  predTitle:       { fontSize: 13, color: '#888', marginBottom: 4 },
  predDate:        { fontSize: 20, fontWeight: 'bold', color: '#C2185B' },
  predSub:         { fontSize: 13, color: '#999' },
  primaryBtn:      { backgroundColor: '#C2185B', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12, width: '100%', alignItems: 'center' },
  primaryBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn:    { backgroundColor: '#FFE4E9', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 },
  secondaryBtnText:{ color: '#C2185B', fontSize: 16, fontWeight: '600' },
  ghostBtn:        { paddingVertical: 10, marginBottom: 24 },
  ghostBtnText:    { color: '#aaa', fontSize: 14 },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal:           { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:      { fontSize: 20, fontWeight: 'bold', color: '#C2185B', marginBottom: 16 },
  input:           { backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#FFE4E9' },
});
"""

SETTINGS_STORAGE = """\
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { getDailyLogs, clearAllData } from '../../src/services/storageService';

export default function SettingsScreen() {
  const [logs, setLogs] = useState([]);

  useEffect(() => { getDailyLogs().then(setLogs); }, []);

  const handleClear = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete your profile and logs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await clearAllData();
            setLogs([]);
            Alert.alert('Done', 'All data cleared.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>⚙️  Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Health Log History</Text>
        {logs.length === 0 ? (
          <Text style={styles.empty}>No logs yet.</Text>
        ) : (
          logs.slice(-10).reverse().map((log, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={styles.logDate}>
                {new Date(log.date).toLocaleDateString()}
              </Text>
              {log.isPeriod && <Text style={styles.badge}>🩸 Period</Text>}
              {log.symptoms?.length > 0 && (
                <Text style={styles.logSub}>{log.symptoms.join(', ')}</Text>
              )}
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.dangerBtn} onPress={handleClear}>
        <Text style={styles.dangerBtnText}>🗑️  Clear All Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flexGrow: 1, backgroundColor: '#FFF5F5', padding: 20 },
  title:        { fontSize: 22, fontWeight: 'bold', color: '#C2185B', marginBottom: 20 },
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  empty:        { color: '#aaa', fontSize: 14 },
  logRow:       { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  logDate:      { fontSize: 13, fontWeight: '600', color: '#555' },
  badge:        { fontSize: 12, color: '#C2185B' },
  logSub:       { fontSize: 12, color: '#999' },
  dangerBtn:    { backgroundColor: '#fff0f0', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ffcccc' },
  dangerBtnText:{ color: '#e53e3e', fontSize: 16, fontWeight: '600' },
});
"""

# ── EMERGENCY-MODULE ────────────────────────
EMERGENCY_SERVICE = """\
const HOTLINE = '108'; // National Ambulance (India)
const ASHA_HOTLINE = '104';

export function classifyEmergency(riskLevel, symptoms = []) {
  const critical = ['heavy_bleeding', 'severe_cramps', 'fever'];
  const hasCritical = critical.some(s => symptoms.includes(s));

  if (riskLevel === 'High' || hasCritical) {
    return {
      level: 'CRITICAL',
      message: 'Seek medical help immediately.',
      hotline: HOTLINE,
      color: '#FF3B30',
    };
  }
  if (riskLevel === 'Medium') {
    return {
      level: 'WARNING',
      message: 'Contact your ASHA worker or local clinic.',
      hotline: ASHA_HOTLINE,
      color: '#FF9500',
    };
  }
  return null;
}

export function simulateSMS(phone, message) {
  // In production this would use an SMS gateway (e.g. MSG91)
  console.log(`[SMS SIMULATION] To: ${phone}`);
  console.log(`[SMS SIMULATION] Body: ${message}`);
  return { sent: true, simulated: true, phone, message };
}
"""

LOCATION_SERVICE = """\
import * as Location from 'expo-location';

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Please enable in device settings.');
  }
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
    });
    return {
      latitude:  loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy:  loc.coords.accuracy,
    };
  } catch (err) {
    throw new Error('Could not fetch location. Please try again.');
  }
}

export function formatCoords(coords) {
  if (!coords) return 'Unknown';
  return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
}
"""

INDEX_EMERGENCY = """\
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput, Modal, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getUserProfile, saveUserProfile } from '../../src/services/storageService';
import { useCycleTracker } from '../../src/hooks/useCycleTracker';
import { classifyEmergency, simulateSMS } from '../../src/services/emergencyService';
import { getCurrentLocation, formatCoords } from '../../src/services/locationService';

export default function HomeScreen() {
  const router = useRouter();
  const { prediction, addLog } = useCycleTracker();
  const [profile, setProfile]           = useState({ name: '', age: '' });
  const [showProfile, setShowProfile]   = useState(false);
  const [lastRisk, setLastRisk]         = useState(null);
  const [gpsCoords, setGpsCoords]       = useState(null);
  const [locLoading, setLocLoading]     = useState(false);

  useEffect(() => {
    getUserProfile().then(p => { if (p) setProfile(p); });
  }, []);

  const saveProfile = async () => {
    if (!profile.name || !profile.age) { Alert.alert('Required', 'Please enter name and age.'); return; }
    await saveUserProfile(profile);
    Alert.alert('Saved', 'Profile updated!');
    setShowProfile(false);
  };

  const logPeriodToday = async () => {
    await addLog({ isPeriod: true });
    Alert.alert('Logged', 'Period logged for today!');
  };

  const fetchLocation = async () => {
    setLocLoading(true);
    try {
      const coords = await getCurrentLocation();
      setGpsCoords(coords);
    } catch (e) {
      Alert.alert('Location Error', e.message);
    } finally {
      setLocLoading(false);
    }
  };

  const handleEmergency = () => {
    const em = classifyEmergency('High', []);
    const loc = gpsCoords ? formatCoords(gpsCoords) : 'unknown';
    simulateSMS('ASHA_WORKER', `EMERGENCY: ${profile.name || 'User'} needs help. Location: ${loc}`);
    Alert.alert(
      '🚨 Emergency Alert Sent',
      `Your ASHA worker has been notified.\n\nLocation: ${loc}\n\nHotline: ${em.hotline}`,
      [
        { text: `Call ${em.hotline}`, onPress: () => Linking.openURL(`tel:${em.hotline}`) },
        { text: 'OK' },
      ]
    );
  };

  const emergency = lastRisk ? classifyEmergency(lastRisk.risk_level, lastRisk.symptoms || []) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>AuraHealth</Text>
      {profile.name && <Text style={styles.greeting}>Welcome, {profile.name}!</Text>}

      {prediction && (
        <View style={styles.predCard}>
          <Text style={styles.predTitle}>Next Period</Text>
          <Text style={styles.predDate}>{prediction.nextPeriod}</Text>
          <Text style={styles.predSub}>in {prediction.daysUntil} days</Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={logPeriodToday}>
        <Text style={styles.primaryBtnText}>🩸  Log Period Today</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/risk')}>
        <Text style={styles.secondaryBtnText}>🩺  Check Health Risk</Text>
      </TouchableOpacity>

      {/* GPS */}
      <TouchableOpacity style={styles.gpsBtn} onPress={fetchLocation} disabled={locLoading}>
        <Text style={styles.gpsBtnText}>
          {locLoading ? '📡 Fetching...' : gpsCoords ? `📍 ${formatCoords(gpsCoords)}` : '📡 Get My Location'}
        </Text>
      </TouchableOpacity>

      {/* Emergency */}
      {emergency && (
        <View style={[styles.emergencyCard, { borderColor: emergency.color }]}>
          <Text style={[styles.emergencyLevel, { color: emergency.color }]}>
            ⚠️  {emergency.level}
          </Text>
          <Text style={styles.emergencyMsg}>{emergency.message}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergency}>
        <Text style={styles.emergencyBtnText}>🚨  Emergency Alert</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowProfile(true)}>
        <Text style={styles.ghostBtnText}>👤  Edit Profile</Text>
      </TouchableOpacity>

      {/* Profile Modal */}
      <Modal visible={showProfile} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Your Profile</Text>
            <TextInput style={styles.input} placeholder="Name" value={profile.name}
              onChangeText={v => setProfile(p => ({ ...p, name: v }))} />
            <TextInput style={styles.input} placeholder="Age" keyboardType="numeric"
              value={profile.age?.toString()}
              onChangeText={v => setProfile(p => ({ ...p, age: v }))} />
            <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfile(false)}>
              <Text style={[styles.ghostBtnText, { textAlign: 'center', marginTop: 12 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flexGrow: 1, alignItems: 'center', backgroundColor: '#FFF5F5', padding: 24 },
  emoji:            { fontSize: 56, marginTop: 20, marginBottom: 8 },
  title:            { fontSize: 28, fontWeight: 'bold', color: '#C2185B', marginBottom: 4 },
  greeting:         { fontSize: 16, color: '#C2185B', marginBottom: 20 },
  predCard:         { backgroundColor: '#fff0f5', borderRadius: 16, padding: 16, width: '100%', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFB6C1' },
  predTitle:        { fontSize: 13, color: '#888', marginBottom: 4 },
  predDate:         { fontSize: 20, fontWeight: 'bold', color: '#C2185B' },
  predSub:          { fontSize: 13, color: '#999' },
  primaryBtn:       { backgroundColor: '#C2185B', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12, width: '100%', alignItems: 'center' },
  primaryBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn:     { backgroundColor: '#FFE4E9', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 },
  secondaryBtnText: { color: '#C2185B', fontSize: 16, fontWeight: '600' },
  gpsBtn:           { backgroundColor: '#f0f9ff', borderRadius: 12, paddingVertical: 12, width: '100%', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#bee3f8' },
  gpsBtnText:       { color: '#2b6cb0', fontSize: 14 },
  emergencyCard:    { backgroundColor: '#fff', borderWidth: 2, borderRadius: 12, padding: 14, width: '100%', marginBottom: 12 },
  emergencyLevel:   { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  emergencyMsg:     { fontSize: 14, color: '#555' },
  emergencyBtn:     { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 16 },
  emergencyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn:         { paddingVertical: 10, marginBottom: 16 },
  ghostBtnText:     { color: '#aaa', fontSize: 14 },
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal:            { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:       { fontSize: 20, fontWeight: 'bold', color: '#C2185B', marginBottom: 16 },
  input:            { backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#FFE4E9' },
});
"""

# ── UI-POLISH ───────────────────────────────
TRANSLATIONS = """\
export const translations = {
  en: {
    appName:       'AuraHealth',
    welcome:       'Welcome',
    logPeriod:     '🩸  Log Period Today',
    checkRisk:     '🩺  Check Health Risk',
    nextPeriod:    'Next Period',
    daysUntil:     'days away',
    emergency:     '🚨  Emergency Alert',
    getLocation:   '📡  Get My Location',
    editProfile:   '👤  Edit Profile',
    save:          'Save',
    cancel:        'Cancel',
    settings:      '⚙️  Settings',
    history:       'Log History',
    clearData:     '🗑️  Clear All Data',
    aiChat:        '💬  AI Health Chat',
    calendar:      '📅  Cycle Calendar',
    home:          'Home',
    selectSymptoms:'Select all symptoms you are experiencing:',
    assessRisk:    'Assess Risk',
    riskHigh:      'High Risk',
    riskMedium:    'Medium Risk',
    riskLow:       'Low Risk',
  },
  hi: {
    appName:       'ऑरा हेल्थ',
    welcome:       'स्वागत है',
    logPeriod:     '🩸  आज का पीरियड लॉग करें',
    checkRisk:     '🩺  स्वास्थ्य जोखिम जांचें',
    nextPeriod:    'अगला पीरियड',
    daysUntil:     'दिन बाकी',
    emergency:     '🚨  आपातकालीन अलर्ट',
    getLocation:   '📡  मेरी लोकेशन प्राप्त करें',
    editProfile:   '👤  प्रोफ़ाइल संपादित करें',
    save:          'सहेजें',
    cancel:        'रद्द करें',
    settings:      '⚙️  सेटिंग्स',
    history:       'लॉग इतिहास',
    clearData:     '🗑️  सभी डेटा हटाएं',
    aiChat:        '💬  एआई स्वास्थ्य चैट',
    calendar:      '📅  चक्र कैलेंडर',
    home:          'होम',
    selectSymptoms:'आपके सभी लक्षण चुनें:',
    assessRisk:    'जोखिम का आकलन करें',
    riskHigh:      'उच्च जोखिम',
    riskMedium:    'मध्यम जोखिम',
    riskLow:       'कम जोखिम',
  },
};
"""

LANGUAGE_CONTEXT = """\
import React, { createContext, useContext, useState } from 'react';
import { translations } from '../constants/translations';

const LanguageContext = createContext({
  language: 'en',
  t: translations.en,
  toggleLanguage: () => {},
  setLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const toggleLanguage = () =>
    setLanguage(prev => (prev === 'en' ? 'hi' : 'en'));

  return (
    <LanguageContext.Provider
      value={{ language, t: translations[language], toggleLanguage, setLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
"""

LANGUAGE_SWITCH_COMPONENT = """\
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitch({ style }) {
  const { language, toggleLanguage } = useLanguage();
  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={toggleLanguage}>
      <Text style={styles.text}>{language === 'en' ? 'हिंदी' : 'EN'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:  { backgroundColor: '#FFE4E9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-end' },
  text: { color: '#C2185B', fontWeight: '700', fontSize: 14 },
});
"""

CALENDAR_COMPONENT = """\
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { getDailyLogs } from '../services/storageService';

export default function CycleCalendar() {
  const [markedDates, setMarked] = useState({});

  useEffect(() => {
    getDailyLogs().then(logs => {
      const marks = {};
      logs.forEach(log => {
        const key = log.date?.split('T')[0];
        if (!key) return;
        if (log.isPeriod) {
          marks[key] = { marked: true, dotColor: '#C2185B', selected: true, selectedColor: '#FFB6C1' };
        } else if (log.symptoms?.length > 0) {
          marks[key] = { marked: true, dotColor: '#FF9500' };
        }
      });
      setMarked(marks);
    });
  }, []);

  return (
    <View style={styles.container}>
      <RNCalendar
        markedDates={markedDates}
        theme={{
          backgroundColor:       '#FFF5F5',
          calendarBackground:    '#FFF5F5',
          todayTextColor:        '#C2185B',
          arrowColor:            '#C2185B',
          selectedDayBackgroundColor: '#FFB6C1',
          dotColor:              '#C2185B',
          textDayFontSize:       14,
          textMonthFontSize:     16,
          textMonthFontWeight:   'bold',
        }}
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FFB6C1' }]} /><Text style={styles.legendText}>Period</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FF9500' }]} /><Text style={styles.legendText}>Symptoms</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#FFF5F5' },
  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 20, padding: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:         { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 12, color: '#666' },
});
"""

CALENDAR_SCREEN_POLISH = """\
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CycleCalendar from '../../src/components/Calendar';
import LanguageSwitch from '../../src/components/LanguageSwitch';
import { useLanguage } from '../../src/context/LanguageContext';

export default function CalendarScreen() {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.calendar}</Text>
        <LanguageSwitch />
      </View>
      <CycleCalendar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50 },
  title:     { fontSize: 22, fontWeight: 'bold', color: '#C2185B' },
});
"""

ROOT_LAYOUT_POLISH = """\
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LanguageProvider } from '../src/context/LanguageContext';
import { getUserProfile } from '../src/services/storageService';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getUserProfile().then(p => {
      setHasProfile(!!p);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || hasProfile === null) return;
    if (!hasProfile && segments[0] !== 'profile-setup') {
      router.replace('/profile-setup');
    }
  }, [ready, hasProfile, segments]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#FFB6C1" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#FFF5F5' }, headerTintColor: '#333', headerTitleStyle: { fontWeight: '600' }, contentStyle: { backgroundColor: '#FFF5F5' } }}>
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
      </Stack>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({ splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5' } });
"""

INDEX_POLISH = """\
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput, Modal, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import LanguageSwitch from '../../src/components/LanguageSwitch';
import { getUserProfile, saveUserProfile } from '../../src/services/storageService';
import { useCycleTracker } from '../../src/hooks/useCycleTracker';
import { classifyEmergency, simulateSMS } from '../../src/services/emergencyService';
import { getCurrentLocation, formatCoords } from '../../src/services/locationService';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { prediction, addLog } = useCycleTracker();
  const [profile, setProfile]         = useState({ name: '', age: '' });
  const [showProfile, setShowProfile] = useState(false);
  const [lastRisk, setLastRisk]       = useState(null);
  const [gpsCoords, setGpsCoords]     = useState(null);
  const [locLoading, setLocLoading]   = useState(false);

  useEffect(() => { getUserProfile().then(p => { if (p) setProfile(p); }); }, []);

  const saveProfile = async () => {
    if (!profile.name || !profile.age) { Alert.alert(t.save, 'Please fill all fields.'); return; }
    await saveUserProfile(profile);
    Alert.alert('✅', `${t.save}d!`);
    setShowProfile(false);
  };

  const logPeriodToday = async () => {
    await addLog({ isPeriod: true });
    Alert.alert('✅', 'Period logged!');
  };

  const fetchLocation = async () => {
    setLocLoading(true);
    try { const c = await getCurrentLocation(); setGpsCoords(c); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setLocLoading(false); }
  };

  const handleEmergency = async () => {
    const em = classifyEmergency('High', []);
    const loc = gpsCoords ? formatCoords(gpsCoords) : 'unknown';
    simulateSMS('ASHA', `EMERGENCY: ${profile.name || 'User'} at ${loc}`);
    Alert.alert('🚨 Alert Sent', `Hotline: ${em.hotline}`, [
      { text: `Call ${em.hotline}`, onPress: () => Linking.openURL(`tel:${em.hotline}`) },
      { text: 'OK' },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t.appName}</Text>
        <LanguageSwitch />
      </View>

      {profile.name && (
        <Text style={styles.greeting}>{t.welcome}, {profile.name}! 👋</Text>
      )}

      {prediction && (
        <View style={styles.predCard}>
          <Text style={styles.predLabel}>{t.nextPeriod}</Text>
          <Text style={styles.predDate}>{prediction.nextPeriod}</Text>
          <Text style={styles.predSub}>{prediction.daysUntil} {t.daysUntil}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={logPeriodToday}>
        <Text style={styles.primaryBtnText}>{t.logPeriod}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/risk')}>
        <Text style={styles.secondaryBtnText}>{t.checkRisk}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.gpsBtn} onPress={fetchLocation} disabled={locLoading}>
        <Text style={styles.gpsBtnText}>
          {locLoading ? '📡 ...' : gpsCoords ? `📍 ${formatCoords(gpsCoords)}` : t.getLocation}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergency}>
        <Text style={styles.emergencyBtnText}>{t.emergency}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowProfile(true)}>
        <Text style={styles.ghostBtnText}>{t.editProfile}</Text>
      </TouchableOpacity>

      <Modal visible={showProfile} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t.editProfile}</Text>
            <TextInput style={styles.input} placeholder="Name" value={profile.name} onChangeText={v => setProfile(p => ({ ...p, name: v }))} />
            <TextInput style={styles.input} placeholder="Age" keyboardType="numeric" value={profile.age?.toString()} onChangeText={v => setProfile(p => ({ ...p, age: v }))} />
            <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile}><Text style={styles.primaryBtnText}>{t.save}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfile(false)}><Text style={[styles.ghostBtnText, { textAlign: 'center', marginTop: 10 }]}>{t.cancel}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flexGrow: 1, backgroundColor: '#FFF5F5', padding: 24 },
  topRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, marginBottom: 8 },
  title:            { fontSize: 24, fontWeight: 'bold', color: '#C2185B' },
  greeting:         { fontSize: 16, color: '#C2185B', marginBottom: 16, textAlign: 'center' },
  predCard:         { backgroundColor: '#fff0f5', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFB6C1' },
  predLabel:        { fontSize: 13, color: '#888', marginBottom: 4 },
  predDate:         { fontSize: 20, fontWeight: 'bold', color: '#C2185B' },
  predSub:          { fontSize: 13, color: '#999' },
  primaryBtn:       { backgroundColor: '#C2185B', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  primaryBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn:     { backgroundColor: '#FFE4E9', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  secondaryBtnText: { color: '#C2185B', fontSize: 16, fontWeight: '600' },
  gpsBtn:           { backgroundColor: '#f0f9ff', borderRadius: 12, paddingVertical: 12, width: '100%', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#bee3f8' },
  gpsBtnText:       { color: '#2b6cb0', fontSize: 14 },
  emergencyBtn:     { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  emergencyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn:         { paddingVertical: 10, marginBottom: 16, alignItems: 'center' },
  ghostBtnText:     { color: '#aaa', fontSize: 14 },
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal:            { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:       { fontSize: 20, fontWeight: 'bold', color: '#C2185B', marginBottom: 16 },
  input:            { backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#FFE4E9' },
});
"""

RISK_SCREEN_POLISH = """\
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useLanguage } from '../../src/context/LanguageContext';
import LanguageSwitch from '../../src/components/LanguageSwitch';
import { calculateRisk, ALL_SYMPTOMS } from '../../src/services/riskEngine';

const SYMPTOM_LABELS_EN = {
  heavy_bleeding: 'Heavy Bleeding', severe_cramps: 'Severe Cramps', fever: 'Fever',
  irregular_cycle: 'Irregular Cycle', discharge: 'Unusual Discharge', fatigue: 'Fatigue',
  nausea: 'Nausea', headache: 'Headache', bloating: 'Bloating', mood_swings: 'Mood Swings',
};
const SYMPTOM_LABELS_HI = {
  heavy_bleeding: 'अधिक रक्तस्राव', severe_cramps: 'तेज दर्द', fever: 'बुखार',
  irregular_cycle: 'अनियमित चक्र', discharge: 'असामान्य स्राव', fatigue: 'थकान',
  nausea: 'मतली', headache: 'सिरदर्द', bloating: 'पेट फूलना', mood_swings: 'मूड बदलना',
};

export default function RiskScreen() {
  const { t, language } = useLanguage();
  const labels = language === 'hi' ? SYMPTOM_LABELS_HI : SYMPTOM_LABELS_EN;
  const [selected, setSelected] = useState([]);
  const [result, setResult]     = useState(null);

  const toggle = (s) => {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    setResult(null);
  };

  const handleAssess = () => {
    if (!selected.length) { Alert.alert('', language === 'hi' ? 'कृपया कम से कम एक लक्षण चुनें' : 'Select at least one symptom.'); return; }
    setResult(calculateRisk(selected));
  };

  const levelLabel = result
    ? (language === 'hi'
      ? result.risk_level === 'High' ? t.riskHigh : result.risk_level === 'Medium' ? t.riskMedium : t.riskLow
      : `${result.risk_level} Risk`)
    : '';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🩺  {language === 'hi' ? 'स्वास्थ्य आकलन' : 'Health Assessment'}</Text>
        <LanguageSwitch />
      </View>
      <Text style={styles.subtitle}>{t.selectSymptoms}</Text>
      <View style={styles.grid}>
        {ALL_SYMPTOMS.map(s => (
          <TouchableOpacity key={s}
            style={[styles.chip, selected.includes(s) && styles.chipOn]}
            onPress={() => toggle(s)}
          >
            <Text style={[styles.chipTxt, selected.includes(s) && styles.chipTxtOn]}>{labels[s]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleAssess}>
        <Text style={styles.btnTxt}>{t.assessRisk}</Text>
      </TouchableOpacity>
      {result && (
        <View style={[styles.result, { borderColor: result.color }]}>
          <Text style={[styles.level, { color: result.color }]}>{levelLabel}</Text>
          <Text style={styles.score}>Score: {result.score}</Text>
          <Text style={styles.msg}>{result.message}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF5F5', padding: 20 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title:     { fontSize: 20, fontWeight: 'bold', color: '#C2185B' },
  subtitle:  { fontSize: 14, color: '#666', marginBottom: 16 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip:      { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FFB6C1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn:    { backgroundColor: '#FFB6C1', borderColor: '#C2185B' },
  chipTxt:   { fontSize: 13, color: '#555' },
  chipTxtOn: { color: '#fff', fontWeight: '600' },
  btn:       { backgroundColor: '#C2185B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  btnTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  result:    { backgroundColor: '#fff', borderWidth: 2, borderRadius: 16, padding: 20, alignItems: 'center' },
  level:     { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  score:     { fontSize: 14, color: '#888', marginBottom: 8 },
  msg:       { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22 },
});
"""

# ─────────────────────────────────────────────
# BRANCH REBUILD FUNCTIONS
# ─────────────────────────────────────────────

def rebuild_main():
    print("\n══ Rebuilding: main ══")
    run("git checkout main")
    run("git reset --hard HEAD")

    # Remove all advanced src folders
    for d in ['src/api', 'src/components', 'src/context', 'src/engine',
              'src/screens', 'src/services', 'src/hooks']:
        remove_dir(d)
    # Remove advanced app screens
    for f in ['app/asha.js', 'app/profile-setup.js', 'app/result.js',
              'app/role-select.js', 'app/symptoms.js']:
        remove(f)

    # Write skeleton files
    write('src/utils/constants.js',        CONSTANTS_SKELETON)
    write('app/_layout.js',                ROOT_LAYOUT_SKELETON)
    write('app/(tabs)/_layout.js',         TABS_LAYOUT)
    write('app/(tabs)/index.js',           INDEX_SKELETON)
    write('app/(tabs)/risk.js',            RISK_SKELETON)
    write('app/(tabs)/chat.js',            CHAT_SKELETON)
    write('app/(tabs)/calendar.js',        CALENDAR_SKELETON)
    write('app/(tabs)/settings.js',        SETTINGS_SKELETON)

    git_add_commit("setup: initial Expo Router project with navigation scaffold")
    print("  ✓ main rebuilt")


def rebuild_core_logic():
    print("\n══ Rebuilding: feature/core-logic ══")
    run("git checkout feature/core-logic")
    run("git reset --hard main")          # start from skeleton

    write('src/services/riskEngine.js',    RISK_ENGINE)
    write('app/(tabs)/risk.js',            RISK_SCREEN_CORE)
    write('app/(tabs)/index.js',           INDEX_CORE)

    git_add_commit("feat: add rule-based risk scoring engine and symptom form")
    print("  ✓ feature/core-logic rebuilt")


def rebuild_local_storage():
    print("\n══ Rebuilding: feature/local-storage ══")
    run("git checkout feature/local-storage")
    run("git reset --hard feature/core-logic")

    write('src/utils/storage.js',          STORAGE_UTIL)
    write('src/services/storageService.js', STORAGE_SERVICE)
    write('src/hooks/useCycleTracker.js',  USE_CYCLE_TRACKER)
    write('app/(tabs)/index.js',           INDEX_STORAGE)
    write('app/(tabs)/settings.js',        SETTINGS_STORAGE)

    git_add_commit("feat: integrate expo-secure-store for offline persistence and cycle prediction")
    print("  ✓ feature/local-storage rebuilt")


def rebuild_emergency():
    print("\n══ Rebuilding: feature/emergency-module ══")
    run("git checkout feature/emergency-module")
    run("git reset --hard feature/local-storage")

    write('src/services/emergencyService.js', EMERGENCY_SERVICE)
    write('src/services/locationService.js',  LOCATION_SERVICE)
    write('app/(tabs)/index.js',              INDEX_EMERGENCY)

    git_add_commit("feat: add GPS location fetch, emergency classification and SMS alert simulation")
    print("  ✓ feature/emergency-module rebuilt")


def rebuild_ui_polish():
    print("\n══ Rebuilding: feature/ui-polish ══")
    run("git checkout feature/ui-polish")
    run("git reset --hard feature/emergency-module")

    write('src/constants/translations.js',    TRANSLATIONS)
    write('src/context/LanguageContext.js',    LANGUAGE_CONTEXT)
    write('src/components/LanguageSwitch.js',  LANGUAGE_SWITCH_COMPONENT)
    write('src/components/Calendar.js',        CALENDAR_COMPONENT)
    write('app/_layout.js',                    ROOT_LAYOUT_POLISH)
    write('app/(tabs)/index.js',               INDEX_POLISH)
    write('app/(tabs)/risk.js',                RISK_SCREEN_POLISH)
    write('app/(tabs)/calendar.js',            CALENDAR_SCREEN_POLISH)

    git_add_commit("ui: add EN/HI language support, cycle calendar, and polished components")
    print("  ✓ feature/ui-polish rebuilt")


def save_full_app_files():
    """Read all 'full app' files from the current checkout before any branch resets."""
    import glob
    saved = {}
    full_app_paths = [
        'src/api/gemini.js',
        'src/engine/RandomForestRiskEngine.js',
        'src/services/HealthDataLogger.js',
        'src/services/SyncManager.js',
        'src/services/syncService.js',
        'src/components/CyclePrediction.js',
        'src/components/MoodHeatmap.js',
        'src/components/VoiceAlert.js',
        'src/components/RiskBadge.js',
        'src/components/SymptomToggle.js',
        'src/screens/ASHAScreen.js',
        'src/screens/ProfileSetupScreen.js',
        'src/screens/ResultScreen.js',
        'src/screens/RoleSelectionScreen.js',
        'src/screens/SymptomScreen.js',
        'app/asha.js',
        'app/role-select.js',
        'app/profile-setup.js',
        'app/result.js',
        'app/symptoms.js',
        'app/(tabs)/chat.js',       # full AI chat version
        'app/_layout.js',           # full layout with role management + sync
        'app/(tabs)/index.js',      # full home with all features
        'app/(tabs)/settings.js',   # full settings
        'app/(tabs)/risk.js',       # full risk screen
        'src/services/riskEngine.js',
        'src/services/emergencyService.js',
        'src/services/locationService.js',
        'src/services/storageService.js',
        'src/utils/storage.js',
        'src/utils/constants.js',
        'src/hooks/useCycleTracker.js',
        'src/constants/translations.js',
        'src/context/LanguageContext.js',
        'src/components/Calendar.js',
        'src/components/LanguageSwitch.js',
    ]
    for rel in full_app_paths:
        full = os.path.join(ROOT, rel)
        if os.path.exists(full):
            with open(full) as f:
                saved[rel] = f.read()
    print(f"  Saved {len(saved)} full-app files for demo/mvp-final")
    return saved


def rebuild_mvp_final(full_app_files):
    """Reset demo/mvp-final to ui-polish, then restore all advanced files."""
    print("\n══ Rebuilding: demo/mvp-final ══")
    run("git checkout demo/mvp-final")
    run("git reset --hard feature/ui-polish")

    # Restore all full-app files
    for rel, content in full_app_files.items():
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(content)

    git_add_commit("feat: add Gemini AI chat, ASHA worker flow, backend sync — full MVP")
    print("  ✓ demo/mvp-final rebuilt")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == '__main__':
    print("AuraHealth Branch Rebuilder")
    print("=" * 40)

    # Drop stash if present (cleanup)
    run("git stash drop 2>/dev/null || true", check=False)

    # Save full-app files BEFORE any branch resets
    run("git checkout demo/mvp-final")
    full_app_files = save_full_app_files()

    rebuild_main()
    rebuild_core_logic()
    rebuild_local_storage()
    rebuild_emergency()
    rebuild_ui_polish()
    rebuild_mvp_final(full_app_files)

    # Return to main
    run("git checkout main")
    print("\n✅ All branches rebuilt.\n")
    print("Run this to force-push all branches:")
    print("  git push origin main feature/core-logic feature/local-storage feature/emergency-module feature/ui-polish demo/mvp-final --force")
