/**
 * App.js — AuraHealth NGO Dashboard
 * ─────────────────────────────────────────────
 * Main application component.
 *
 * Features:
 *   1. Simple password-based login
 *   2. Village selector dropdown
 *   3. Charts:
 *      - Pie chart → Risk distribution
 *      - Bar chart → Symptom trends
 *      - Line chart → Monthly high-risk trend
 *   4. Fetches anonymized data from backend
 *
 * No personal data is displayed anywhere.
 * ─────────────────────────────────────────────
 */

import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

// ── Global Styles ──────────────────────────────
const globalStyle = {
  minHeight: '100vh',
  backgroundColor: '#FFF5F5',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div style={globalStyle}>
      {isLoggedIn ? (
        <Dashboard onLogout={() => setIsLoggedIn(false)} />
      ) : (
        <LoginScreen onLogin={() => setIsLoggedIn(true)} />
      )}
    </div>
  );
}
