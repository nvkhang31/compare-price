const mongoose = require('mongoose');

const fieldComparisonSchema = new mongoose.Schema({
  kisValue:    { type: Number, default: null },
  sourceValue: { type: Number, default: null },
  diff:        { type: Number, default: null },
  diffPct:     { type: Number, default: null },
  match:       { type: Boolean, default: null }
}, { _id: false });

const sourceComparisonSchema = new mongoose.Schema({
  source:         { type: String, required: true }, // vps | vndirect | tcbs
  ceiling:        { type: fieldComparisonSchema, default: {} },
  floor:          { type: fieldComparisonSchema, default: {} },
  reference:      { type: fieldComparisonSchema, default: {} },
  hasDiscrepancy: { type: Boolean, default: false }
}, { _id: false });

const comparisonSchema = new mongoose.Schema({
  symbol:            { type: String, required: true, uppercase: true },
  date:              { type: String, required: true }, // YYYY-MM-DD
  exchange:          { type: String, default: null },

  kisPrice: {
    ceilingPrice:    { type: Number, default: null },
    floorPrice:      { type: Number, default: null },
    referencePrice:  { type: Number, default: null }
  },

  comparisons:       { type: [sourceComparisonSchema], default: [] },
  sourcesCompared:   { type: [String], default: [] },
  hasDiscrepancy:    { type: Boolean, default: false, index: true },
  discrepantSources: { type: [String], default: [] },

  comparedAt:        { type: Date, default: Date.now }
});

comparisonSchema.index({ symbol: 1, date: 1 }, { unique: true });
comparisonSchema.index({ date: 1, hasDiscrepancy: 1 });

module.exports = mongoose.model('Comparison', comparisonSchema);
