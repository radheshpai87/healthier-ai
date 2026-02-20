/**
 * HealthRecord.js
 * ─────────────────────────────────────────────
 * MongoDB model for anonymized health records.
 *
 * PRIVACY: No personal data is stored.
 *   - No names, phone numbers, or IDs
 *   - Only villageCode for geographic grouping
 *   - Timestamps for trend analysis
 *   - Symptoms + risk level for aggregation
 * ─────────────────────────────────────────────
 */

const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    // Village identifier — no personal data
    villageCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    // When the assessment was taken
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Numeric risk score from rule-based engine
    score: {
      type: Number,
      required: true,
      min: 0,
    },

    // Risk level classification
    level: {
      type: String,
      required: true,
      enum: ['LOW', 'MODERATE', 'HIGH'],
      index: true,
    },

    // Symptom flags (boolean map)
    symptoms: {
      heavyBleeding: { type: Boolean, default: false },
      fatigue: { type: Boolean, default: false },
      dizziness: { type: Boolean, default: false },
      lowHb: { type: Boolean, default: false },
      irregularCycles: { type: Boolean, default: false },
      pain: { type: Boolean, default: false },
      pregnancyIssue: { type: Boolean, default: false },
    },
  },
  {
    // Disable versioning key (__v) for simplicity
    versionKey: false,
    // Auto-create createdAt and updatedAt fields
    timestamps: true,
  }
);

// ── Indexes for analytics queries ──────────────
// Compound index for village + level aggregation
healthRecordSchema.index({ villageCode: 1, level: 1 });
// Index for time-based queries
healthRecordSchema.index({ villageCode: 1, timestamp: -1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
