/**
 * healthRoutes.js
 * ─────────────────────────────────────────────
 * API routes for AuraHealth backend.
 *
 * POST /api/sync            — Receive batch of health records
 * GET  /api/ping            — Connectivity check
 * GET  /api/analytics/village/:code — Aggregated village stats
 * GET  /api/analytics/trends/:code  — Monthly trend data
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
    res.status(200).json({
      villageCode,
      totalRecords: data.totalRecords,
      avgScore: Math.round(data.avgScore * 10) / 10,
      highRiskCount: data.highRiskCount,
      moderateCount: data.moderateCount,
      lowCount: data.lowCount,
      anemiaRate:
        data.totalRecords > 0
          ? Math.round((data.anemiaCount / data.totalRecords) * 100)
          : 0,
      heavyBleedingRate:
        data.totalRecords > 0
          ? Math.round((data.heavyBleedingCount / data.totalRecords) * 100)
          : 0,
      pregnancyIssueCount: data.pregnancyIssueCount,
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

module.exports = router;
