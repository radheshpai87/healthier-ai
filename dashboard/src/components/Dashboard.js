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
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Load Village List ────────────────────────
  useEffect(() => {
    async function fetchVillages() {
      try {
        const [villagesRes, summaryRes] = await Promise.all([
          axios.get(`${API_BASE}/analytics/villages`),
          axios.get(`${API_BASE}/analytics/summary`),
        ]);
        setVillages(villagesRes.data.villages || []);
        setSummary(summaryRes.data);
        if (villagesRes.data.villages?.length > 0) {
          setSelectedVillage(villagesRes.data.villages[0]);
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

  // ── Chart Data: Bar (Symptom Breakdown — all 7) ──
  const barData = stats
    ? {
        labels: [
          'Anemia', 'Heavy\nBleeding', 'Fatigue',
          'Dizziness', 'Irregular\nCycles', 'Pain', 'Pregnancy\nIssue',
        ],
        datasets: [
          {
            label: 'Prevalence Rate (%)',
            data: [
              stats.anemiaRate || 0,
              stats.heavyBleedingRate || 0,
              stats.fatigueRate || 0,
              stats.dizzinessRate || 0,
              stats.irregularRate || 0,
              stats.painRate || 0,
              stats.pregnancyIssueRate || 0,
            ],
            backgroundColor: [
              '#E91E63', '#FF5722', '#FF9800',
              '#9C27B0', '#2196F3', '#F44336', '#4CAF50',
            ],
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
          <h1 style={styles.headerTitle}>AuraHealth Dashboard</h1>
          <p style={styles.headerSub}>Anonymized Village Health Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a
            href={`${API_BASE}/export/csv`}
            download
            style={styles.exportBtn}
          >
            Export All (CSV)
          </a>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      {error && <p style={styles.error}>{error}</p>}

      {/* ── All-Villages NGO Summary Table ─────── */}
      {summary && summary.villages && summary.villages.length > 0 && (
        <div style={styles.summarySection}>
          <div style={styles.summaryHeader}>
            <div>
              <h2 style={styles.sectionTitle}>All-Villages Overview</h2>
              <p style={styles.sectionSub}>
                {summary.totals?.totalRecords || 0} total assessments across {summary.villages.length} village{summary.villages.length !== 1 ? 's' : ''}
              </p>
            </div>
            <a
              href={`${API_BASE}/export/csv`}
              download
              style={{ ...styles.exportBtn, fontSize: '13px' }}
            >
              Download CSV
            </a>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  {['Village', 'Assessments', 'High Risk', 'Moderate', 'High Risk %',
                    'Anemia %', 'Bleeding %', 'Fatigue %', 'Pain %', 'Pregnancy %', 'Avg Score', 'Last Update'
                  ].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.villages.map((v, i) => (
                  <tr
                    key={v.villageCode}
                    style={{
                      ...styles.tableRow,
                      backgroundColor: i % 2 === 0 ? '#FAFAFA' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedVillage(v.villageCode)}
                    title={`Click to view details for ${v.villageCode}`}
                  >
                    <td style={{ ...styles.td, fontWeight: '700', color: '#333' }}>{v.villageCode}</td>
                    <td style={styles.td}>{v.totalRecords}</td>
                    <td style={{ ...styles.td, color: '#F44336', fontWeight: '600' }}>{v.highRiskCount}</td>
                    <td style={{ ...styles.td, color: '#FF9800' }}>{v.moderateCount}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: v.highRiskRate >= 30 ? '#FFEBEE' : v.highRiskRate >= 15 ? '#FFF3E0' : '#E8F5E9',
                        color: v.highRiskRate >= 30 ? '#C62828' : v.highRiskRate >= 15 ? '#E65100' : '#2E7D32',
                      }}>
                        {v.highRiskRate}%
                      </span>
                    </td>
                    <td style={styles.td}>{v.anemiaRate}%</td>
                    <td style={styles.td}>{v.heavyBleedingRate}%</td>
                    <td style={styles.td}>{v.fatigueRate}%</td>
                    <td style={styles.td}>{v.painRate}%</td>
                    <td style={styles.td}>{v.pregnancyRate}%</td>
                    <td style={{ ...styles.td, color: v.avgScore >= 10 ? '#F44336' : '#888' }}>{v.avgScore}</td>
                    <td style={{ ...styles.td, fontSize: '11px', color: '#AAA' }}>
                      {v.lastRecord ? new Date(v.lastRecord).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '12px', color: '#AAA', marginTop: '8px' }}>
            Click a row to view that village's detailed charts below
          </p>
        </div>
      )}

      {/* Village selector + controls */}
      <div style={styles.controlsBar}>
        <label style={styles.selectorLabel}>Village Detail:</label>
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
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        {selectedVillage && (
          <a
            href={`${API_BASE}/export/csv?village=${selectedVillage}`}
            download
            style={{ ...styles.exportBtn, fontSize: '13px' }}
          >
            {selectedVillage} CSV
          </a>
        )}
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
          <p style={{ fontSize: '48px', margin: '0', color: '#DDD' }}>—</p>
          <p style={{ color: '#888' }}>
            No data available for village <strong>{selectedVillage}</strong>.
            <br />
            Data will appear once field assessments are synced.
          </p>
        </div>
      )}

      {/* Privacy Footer */}
      <footer style={styles.footer}>
        All data is anonymized. No personal information is stored or displayed.
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
    padding: '32px 28px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    paddingBottom: '24px',
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
    gap: '14px',
    marginBottom: '36px',
    flexWrap: 'wrap',
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '36px',
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
    padding: '14px 16px',
    backgroundColor: '#FFF0F0',
    borderRadius: '8px',
    marginBottom: '28px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
    marginBottom: '44px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '28px 20px',
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
    gap: '28px',
    marginBottom: '44px',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '32px',
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
    padding: '44px 0 32px',
    lineHeight: '1.8',
  },
  exportBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  summarySection: { marginBottom: '48px' },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#333', margin: '0' },
  sectionSub: { fontSize: '13px', color: '#888', margin: '4px 0 0 0' },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#FFFFFF',
  },
  tableHeadRow: { backgroundColor: '#FFF0F5' },
  th: {
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '700',
    color: '#888',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 14px',
    fontSize: '14px',
    color: '#444',
    borderBottom: '1px solid #F5F5F5',
  },
  tableRow: { cursor: 'pointer', transition: 'background-color 0.15s' },
  badge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
  },
};
