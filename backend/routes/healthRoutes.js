/**
 * healthRoutes.js
 * ─────────────────────────────────────────────
 * API routes for AuraHealth backend.
 *
 * POST /api/sync                    — Batch health records (storageService)
 * POST /api/health-data             — Single health record (SyncManager)
 * GET  /api/ping                    — Connectivity check
 * GET  /api/analytics/village/:code — Aggregated village stats
 * GET  /api/analytics/trends/:code  — Monthly trend data
 * GET  /api/analytics/villages      — List all villages
 * GET  /api/analytics/summary       — Cross-village NGO summary
 * GET  /api/export/csv              — CSV download for NGOs
 * ─────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const HealthRecord = require('../models/HealthRecord');

// ── GET /api/ping ──────────────────────────────
// Simple connectivity check endpoint.
// Used by mobile app to detect internet availability.
router.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── POST /api/sync ─────────────────────────────
// Accept an array of anonymized health records from
// the mobile app and insert into the database.
//
// Body: { records: [ { villageCode, timestamp, score, level, symptoms } ] }
router.post('/sync', async (req, res) => {
  try {
    const { records } = req.body;

    // Validate input
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: 'Invalid request. Expected { records: [...] }',
      });
    }

    // Limit batch size to prevent abuse
    if (records.length > 100) {
      return res.status(400).json({
        error: 'Too many records in one batch. Maximum 100.',
      });
    }

    // Sanitize and prepare records for insertion
    const sanitizedRecords = records.map((record) => ({
      villageCode: String(record.villageCode || 'UNKNOWN').toUpperCase().substring(0, 20),
      timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
      score: Math.max(0, Math.min(50, Number(record.score) || 0)),
      level: ['LOW', 'MODERATE', 'HIGH'].includes(record.level)
        ? record.level
        : 'LOW',
      symptoms: {
        heavyBleeding: Boolean(record.symptoms?.heavyBleeding),
        fatigue: Boolean(record.symptoms?.fatigue),
        dizziness: Boolean(record.symptoms?.dizziness),
        lowHb: Boolean(record.symptoms?.lowHb),
        irregularCycles: Boolean(record.symptoms?.irregularCycles),
        pain: Boolean(record.symptoms?.pain),
        pregnancyIssue: Boolean(record.symptoms?.pregnancyIssue),
      },
    }));

    // Insert all records
    const result = await HealthRecord.insertMany(sanitizedRecords, {
      ordered: false, // Continue on individual errors
    });

    res.status(201).json({
      message: `${result.length} records synced successfully`,
      count: result.length,
    });
  } catch (error) {
    console.error('[healthRoutes] Sync error:', error);

    // Handle partial insertion (duplicate key, etc.)
    if (error.insertedDocs) {
      return res.status(207).json({
        message: 'Partial sync completed',
        inserted: error.insertedDocs.length,
        errors: error.writeErrors?.length || 0,
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/analytics/village/:code ───────────
// Return aggregated statistics for a specific village.
// No personal data is returned — only counts and rates.
router.get('/analytics/village/:code', async (req, res) => {
  try {
    const villageCode = req.params.code.toUpperCase();

    // Run aggregation pipeline
    const stats = await HealthRecord.aggregate([
      { $match: { villageCode } },
      {
        $group: {
          _id: '$villageCode',
          totalRecords: { $sum: 1 },
          avgScore: { $avg: '$score' },
          highRiskCount: {
            $sum: { $cond: [{ $eq: ['$level', 'HIGH'] }, 1, 0] },
          },
          moderateCount: {
            $sum: { $cond: [{ $eq: ['$level', 'MODERATE'] }, 1, 0] },
          },
          lowCount: {
            $sum: { $cond: [{ $eq: ['$level', 'LOW'] }, 1, 0] },
          },
          anemiaCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.lowHb', true] }, 1, 0] },
          },
          heavyBleedingCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.heavyBleeding', true] }, 1, 0] },
          },
          fatigueCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.fatigue', true] }, 1, 0] },
          },
          dizzinessCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.dizziness', true] }, 1, 0] },
          },
          irregularCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.irregularCycles', true] }, 1, 0] },
          },
          painCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.pain', true] }, 1, 0] },
          },
          pregnancyIssueCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.pregnancyIssue', true] }, 1, 0] },
          },
          firstRecord: { $min: '$timestamp' },
          lastRecord: { $max: '$timestamp' },
        },
      },
    ]);

    if (stats.length === 0) {
      return res.status(200).json({
        villageCode,
        totalRecords: 0,
        highRiskCount: 0,
        moderateCount: 0,
        lowCount: 0,
        anemiaRate: 0,
        avgScore: 0,
      });
    }

    const data = stats[0];
    const n = data.totalRecords;
    const pct = (count) => (n > 0 ? Math.round((count / n) * 100) : 0);
    res.status(200).json({
      villageCode,
      totalRecords: n,
      avgScore: Math.round(data.avgScore * 10) / 10,
      highRiskCount: data.highRiskCount,
      moderateCount: data.moderateCount,
      lowCount: data.lowCount,
      anemiaRate: pct(data.anemiaCount),
      heavyBleedingRate: pct(data.heavyBleedingCount),
      fatigueRate: pct(data.fatigueCount),
      dizzinessRate: pct(data.dizzinessCount),
      irregularRate: pct(data.irregularCount),
      painRate: pct(data.painCount),
      pregnancyIssueRate: pct(data.pregnancyIssueCount),
      firstRecord: data.firstRecord,
      lastRecord: data.lastRecord,
    });
  } catch (error) {
    console.error('[healthRoutes] Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/analytics/trends/:code ────────────
// Return monthly trend data for charts.
// Groups records by month, counts risk levels per month.
router.get('/analytics/trends/:code', async (req, res) => {
  try {
    const villageCode = req.params.code.toUpperCase();

    const trends = await HealthRecord.aggregate([
      { $match: { villageCode } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
          },
          totalRecords: { $sum: 1 },
          highRiskCount: {
            $sum: { $cond: [{ $eq: ['$level', 'HIGH'] }, 1, 0] },
          },
          moderateCount: {
            $sum: { $cond: [{ $eq: ['$level', 'MODERATE'] }, 1, 0] },
          },
          lowCount: {
            $sum: { $cond: [{ $eq: ['$level', 'LOW'] }, 1, 0] },
          },
          anemiaCount: {
            $sum: { $cond: [{ $eq: ['$symptoms.lowHb', true] }, 1, 0] },
          },
          avgScore: { $avg: '$score' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format for chart.js consumption
    const formatted = trends.map((t) => ({
      month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
      totalRecords: t.totalRecords,
      highRiskCount: t.highRiskCount,
      moderateCount: t.moderateCount,
      lowCount: t.lowCount,
      anemiaCount: t.anemiaCount,
      avgScore: Math.round(t.avgScore * 10) / 10,
    }));

    res.status(200).json({ villageCode, trends: formatted });
  } catch (error) {
    console.error('[healthRoutes] Trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/analytics/villages ────────────────
// Return list of all villages that have data.
router.get('/analytics/villages', async (req, res) => {
  try {
    const villages = await HealthRecord.distinct('villageCode');
    res.status(200).json({ villages });
  } catch (error) {
    console.error('[healthRoutes] Villages list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/health-data ──────────────────────
// Accept a single anonymized health record from
// SyncManager.js on the mobile app.
//
// Body: { type, data: { villageCode, score, level, symptoms, ... }, timestamp }
router.post('/health-data', async (req, res) => {
  try {
    const { data, timestamp } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Missing data field' });
    }

    // Normalise — SyncManager sends symptoms as an array, backend wants an object
    let symptomsObj = {};
    if (Array.isArray(data.symptoms)) {
      data.symptoms.forEach((s) => { symptomsObj[s] = true; });
    } else if (data.symptoms && typeof data.symptoms === 'object') {
      symptomsObj = data.symptoms;
    }

    const record = new HealthRecord({
      villageCode: String(data.villageCode || 'UNKNOWN').toUpperCase().substring(0, 20),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      score: Math.max(0, Math.min(50, Number(data.score) || 0)),
      level: ['LOW', 'MODERATE', 'HIGH'].includes(String(data.level).toUpperCase())
        ? String(data.level).toUpperCase()
        : 'LOW',
      symptoms: {
        heavyBleeding:    Boolean(symptomsObj.heavyBleeding   || symptomsObj.heavy_bleeding),
        fatigue:          Boolean(symptomsObj.fatigue),
        dizziness:        Boolean(symptomsObj.dizziness),
        lowHb:            Boolean(symptomsObj.lowHb            || symptomsObj.low_hb),
        irregularCycles:  Boolean(symptomsObj.irregularCycles  || symptomsObj.irregular_cycles),
        pain:             Boolean(symptomsObj.pain),
        pregnancyIssue:   Boolean(symptomsObj.pregnancyIssue   || symptomsObj.pregnancy_issue),
      },
    });

    await record.save();
    res.status(201).json({ message: 'Record saved', id: record._id });
  } catch (error) {
    console.error('[healthRoutes] health-data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/analytics/summary ─────────────────
// Cross-village NGO summary — one row per village,
// totals and rates for the dashboard overview table.
router.get('/analytics/summary', async (req, res) => {
  try {
    const summary = await HealthRecord.aggregate([
      {
        $group: {
          _id: '$villageCode',
          totalRecords:       { $sum: 1 },
          highRiskCount:      { $sum: { $cond: [{ $eq: ['$level', 'HIGH'] },     1, 0] } },
          moderateCount:      { $sum: { $cond: [{ $eq: ['$level', 'MODERATE'] }, 1, 0] } },
          lowCount:           { $sum: { $cond: [{ $eq: ['$level', 'LOW'] },      1, 0] } },
          anemiaCount:        { $sum: { $cond: [{ $eq: ['$symptoms.lowHb',           true] }, 1, 0] } },
          heavyBleedingCount: { $sum: { $cond: [{ $eq: ['$symptoms.heavyBleeding',   true] }, 1, 0] } },
          fatigueCount:       { $sum: { $cond: [{ $eq: ['$symptoms.fatigue',         true] }, 1, 0] } },
          dizzinessCount:     { $sum: { $cond: [{ $eq: ['$symptoms.dizziness',       true] }, 1, 0] } },
          irregularCount:     { $sum: { $cond: [{ $eq: ['$symptoms.irregularCycles', true] }, 1, 0] } },
          painCount:          { $sum: { $cond: [{ $eq: ['$symptoms.pain',            true] }, 1, 0] } },
          pregnancyCount:     { $sum: { $cond: [{ $eq: ['$symptoms.pregnancyIssue',  true] }, 1, 0] } },
          avgScore:           { $avg: '$score' },
          lastRecord:         { $max: '$timestamp' },
        },
      },
      { $sort: { highRiskCount: -1 } },
    ]);

    const rows = summary.map((v) => ({
      villageCode:        v._id,
      totalRecords:       v.totalRecords,
      highRiskCount:      v.highRiskCount,
      moderateCount:      v.moderateCount,
      lowCount:           v.lowCount,
      highRiskRate:       Math.round((v.highRiskCount / v.totalRecords) * 100),
      anemiaRate:         Math.round((v.anemiaCount        / v.totalRecords) * 100),
      heavyBleedingRate:  Math.round((v.heavyBleedingCount / v.totalRecords) * 100),
      fatigueRate:        Math.round((v.fatigueCount       / v.totalRecords) * 100),
      dizzinessRate:      Math.round((v.dizzinessCount     / v.totalRecords) * 100),
      irregularRate:      Math.round((v.irregularCount     / v.totalRecords) * 100),
      painRate:           Math.round((v.painCount          / v.totalRecords) * 100),
      pregnancyRate:      Math.round((v.pregnancyCount     / v.totalRecords) * 100),
      avgScore:           Math.round(v.avgScore * 10) / 10,
      lastRecord:         v.lastRecord,
    }));

    const totals = rows.reduce(
      (acc, v) => {
        acc.totalRecords  += v.totalRecords;
        acc.highRiskCount += v.highRiskCount;
        return acc;
      },
      { totalRecords: 0, highRiskCount: 0 }
    );

    res.status(200).json({ villages: rows, totals });
  } catch (error) {
    console.error('[healthRoutes] Summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/export/csv ────────────────────────
// Download all anonymized records as a CSV file.
// NGOs can open this directly in Excel / Google Sheets.
//
// Optional query params:
//   ?village=VILL001   — filter to one village
//   ?days=30           — last N days only
router.get('/export/csv', async (req, res) => {
  try {
    const filter = {};
    if (req.query.village) {
      filter.villageCode = req.query.village.toUpperCase();
    }
    if (req.query.days) {
      const d = parseInt(req.query.days, 10);
      if (!isNaN(d) && d > 0) {
        filter.timestamp = { $gte: new Date(Date.now() - d * 24 * 60 * 60 * 1000) };
      }
    }

    const records = await HealthRecord.find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    // Build CSV
    const header = [
      'villageCode', 'timestamp', 'riskLevel', 'riskScore',
      'heavyBleeding', 'fatigue', 'dizziness', 'anemia(lowHb)',
      'irregularCycles', 'pain', 'pregnancyIssue',
    ].join(',');

    const rows = records.map((r) => [
      r.villageCode,
      new Date(r.timestamp).toISOString(),
      r.level,
      r.score,
      r.symptoms?.heavyBleeding   ? 1 : 0,
      r.symptoms?.fatigue         ? 1 : 0,
      r.symptoms?.dizziness       ? 1 : 0,
      r.symptoms?.lowHb           ? 1 : 0,
      r.symptoms?.irregularCycles ? 1 : 0,
      r.symptoms?.pain            ? 1 : 0,
      r.symptoms?.pregnancyIssue  ? 1 : 0,
    ].join(','));

    const csv = [header, ...rows].join('\n');
    const filename = `aurahealth_${req.query.village || 'all'}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('[healthRoutes] CSV export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
