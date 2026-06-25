const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  symbol:           { type: String, required: true, uppercase: true },
  date:             { type: String, required: true },
  exchange:         { type: String, default: null },

  discrepancyType:  { type: String, enum: ['ceilingPrice', 'floorPrice', 'referencePrice'] },
  severity:         { type: String, enum: ['critical', 'warning', 'info'], required: true },

  differenceAmount:  { type: Number, default: 0 },
  differencePercent: { type: Number, default: 0 },

  sources: {
    kis:      { type: Number, default: null },
    vndirect: { type: Number, default: null },
    tcbs:     { type: Number, default: null }
  },

  status:           { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },

  acknowledgedBy:   { type: String, default: null },
  acknowledgedAt:   { type: Date, default: null },
  resolvedBy:       { type: String, default: null },
  resolvedAt:       { type: Date, default: null },
  resolution:       { type: String, default: null },

  createdAt:        { type: Date, default: Date.now }
});

alertSchema.index({ status: 1, severity: 1 });
alertSchema.index({ symbol: 1, date: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
