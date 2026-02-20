/**
 * LoginScreen.js — Simple password-based login
 * ─────────────────────────────────────────────
 * Basic authentication for NGO dashboard access.
 * Password is checked against environment variable
 * or a default for development.
 * ─────────────────────────────────────────────
 */

import React, { useState } from 'react';

// Default password — in production, this should be
// validated against the backend
const DASHBOARD_PASSWORD = process.env.REACT_APP_DASHBOARD_PASSWORD || 'aurahealth2024';

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === DASHBOARD_PASSWORD) {
      setError('');
      onLogin();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏥 AuraHealth</h1>
        <h2 style={styles.subtitle}>NGO Dashboard</h2>
        <p style={styles.description}>
          View anonymized health analytics from village field visits.
          No personal data is displayed.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter dashboard password"
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button}>
            Login
          </button>
        </form>

        <p style={styles.privacy}>
          🔒 All data shown is anonymized and aggregated.
          No personal information is stored or displayed.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '48px 40px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#888',
    margin: '0 0 20px 0',
  },
  description: {
    fontSize: '14px',
    color: '#AAA',
    lineHeight: '1.5',
    marginBottom: '28px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #E0E0E0',
    borderRadius: '12px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '12px',
  },
  error: {
    color: '#F44336',
    fontSize: '14px',
    margin: '0 0 12px 0',
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#FFB6C1',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  privacy: {
    fontSize: '12px',
    color: '#BBB',
    marginTop: '24px',
    lineHeight: '1.4',
  },
};
