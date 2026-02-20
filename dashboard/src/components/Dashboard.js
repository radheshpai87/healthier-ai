/**
 * Dashboard.js — Main dashboard view
 * ─────────────────────────────────────────────
 * NGO analytics dashboard showing:
 *   1. Village selector dropdown
 *   2. Summary stats cards
 *   3. Pie chart  → Risk distribution
 *   4. Bar chart  → Symptom breakdown
 *   5. Line chart → Monthly high-risk trend
 *
 * All data is anonymized — no personal info.
 * ─────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

// Backend URL — update after deployment
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function Dashboard({ onLogout }) {
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('');
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Load Village List ────────────────────────
  useEffect(() => {
    async function fetchVillages() {
      try {
        const res = await axios.get(`${API_BASE}/analytics/villages`);
        setVillages(res.data.villages || []);
        if (res.data.villages?.length > 0) {
          setSelectedVillage(res.data.villages[0]);
        }
      } catch (err) {
        setError('Failed to load village list. Is the backend running?');
      }
    }
    fetchVillages();
  }, []);

  // ── Load Village Data ────────────────────────
  const loadVillageData = useCallback(async () => {
    if (!selectedVillage) return;
    setLoading(true);
    setError('');

    try {
      const [statsRes, trendsRes] = await Promise.all([
        axios.get(`${API_BASE}/analytics/village/${selectedVillage}`),
        axios.get(`${API_BASE}/analytics/trends/${selectedVillage}`),
      ]);

      setStats(statsRes.data);
      setTrends(trendsRes.data.trends || []);
    } catch (err) {
      setError('Failed to load village data.');
    } finally {
      setLoading(false);
    }
  }, [selectedVillage]);

  useEffect(() => {
    loadVillageData();
  }, [loadVillageData]);

  // ── Chart Data: Pie (Risk Distribution) ──────
  const pieData = stats
    ? {
        labels: ['Low Risk', 'Moderate Risk', 'High Risk'],
        datasets: [
          {
            data: [stats.lowCount || 0, stats.moderateCount || 0, stats.highRiskCount || 0],
            backgroundColor: ['#4CAF50', '#FF9800', '#F44336'],
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      }
    : null;

  // ── Chart Data: Bar (Symptom Breakdown) ──────
  const barData = stats
    ? {
        labels: [
          'Anemia',
          'Heavy Bleeding',
          'Pregnancy Issues',
        ],
        datasets: [
          {
            label: 'Prevalence Rate (%)',
            data: [
              stats.anemiaRate || 0,
              stats.heavyBleedingRate || 0,
              stats.totalRecords > 0
                ? Math.round((stats.pregnancyIssueCount / stats.totalRecords) * 100)
                : 0,
            ],
            backgroundColor: ['#E91E63', '#FF5722', '#9C27B0'],
            borderRadius: 8,
          },
        ],
      }
    : null;

  // ── Chart Data: Line (Monthly Trends) ────────
  const lineData =
    trends.length > 0
      ? {
          labels: trends.map((t) => t.month),
          datasets: [
            {
              label: 'High Risk',
              data: trends.map((t) => t.highRiskCount),
              borderColor: '#F44336',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              fill: true,
              tension: 0.3,
            },
            {
              label: 'Moderate Risk',
              data: trends.map((t) => t.moderateCount),
              borderColor: '#FF9800',
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              fill: true,
              tension: 0.3,
            },
            {
              label: 'Total Assessments',
              data: trends.map((t) => t.totalRecords),
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        }
      : null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>🏥 AuraHealth Dashboard</h1>
          <p style={styles.headerSub}>Anonymized Village Health Analytics</p>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      {/* Village Selector */}
      <div style={styles.selectorRow}>
        <label style={styles.selectorLabel}>Select Village:</label>
        <select
          value={selectedVillage}
          onChange={(e) => setSelectedVillage(e.target.value)}
          style={styles.selector}
        >
          {villages.length === 0 && <option value="">No villages found</option>}
          {villages.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <button onClick={loadVillageData} style={styles.refreshBtn}>
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {/* Summary Cards */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={{ ...styles.statCard, borderTop: '4px solid #2196F3' }}>
            <div style={styles.statNumber}>{stats.totalRecords}</div>
            <div style={styles.statLabel}>Total Assessments</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #F44336' }}>
            <div style={{ ...styles.statNumber, color: '#F44336' }}>
              {stats.highRiskCount}
            </div>
            <div style={styles.statLabel}>High Risk</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #FF9800' }}>
            <div style={{ ...styles.statNumber, color: '#FF9800' }}>
              {stats.moderateCount}
            </div>
            <div style={styles.statLabel}>Moderate Risk</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #E91E63' }}>
            <div style={{ ...styles.statNumber, color: '#E91E63' }}>
              {stats.anemiaRate}%
            </div>
            <div style={styles.statLabel}>Anemia Rate</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: '4px solid #4CAF50' }}>
            <div style={{ ...styles.statNumber, color: '#4CAF50' }}>
              {stats.avgScore}
            </div>
            <div style={styles.statLabel}>Avg Risk Score</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && stats.totalRecords > 0 && (
        <div style={styles.chartsGrid}>
          {/* Pie Chart — Risk Distribution */}
          {pieData && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Risk Distribution</h3>
              <div style={styles.pieContainer}>
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom' },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Bar Chart — Symptom Breakdown */}
          {barData && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Symptom Prevalence (%)</h3>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { callback: (v) => v + '%' },
                    },
                  },
                }}
              />
            </div>
          )}

          {/* Line Chart — Monthly Trends */}
          {lineData && (
            <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
              <h3 style={styles.chartTitle}>Monthly Trend</h3>
              <Line
                data={lineData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                  },
                  scales: {
                    y: { beginAtZero: true },
                  },
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {stats && stats.totalRecords === 0 && (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '48px', margin: '0' }}>📊</p>
          <p style={{ color: '#888' }}>
            No data available for village <strong>{selectedVillage}</strong>.
            <br />
            Data will appear once field assessments are synced.
          </p>
        </div>
      )}

      {/* Privacy Footer */}
      <footer style={styles.footer}>
        🔒 All data is anonymized. No personal information is stored or displayed.
        <br />
        AuraHealth — Rural Women's Health Platform
      </footer>
    </div>
  );
}

// ── Styles ─────────────────────────────────────
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #FFE4E9',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    margin: '0',
  },
  headerSub: {
    fontSize: '14px',
    color: '#888',
    margin: '4px 0 0 0',
  },
  logoutBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#888',
    backgroundColor: 'transparent',
    border: '2px solid #E0E0E0',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  selectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  selectorLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#555',
  },
  selector: {
    padding: '10px 16px',
    fontSize: '15px',
    border: '2px solid #E0E0E0',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    minWidth: '200px',
  },
  refreshBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: '#FFB6C1',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  error: {
    color: '#F44336',
    fontSize: '14px',
    padding: '12px',
    backgroundColor: '#FFF0F0',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#555',
    marginTop: '0',
    marginBottom: '16px',
  },
  pieContainer: {
    maxWidth: '320px',
    margin: '0 auto',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#BBB',
    padding: '24px 0',
    lineHeight: '1.5',
  },
};
