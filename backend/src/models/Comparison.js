const mongoose = require('mongoose');

const priceSnapshotSchema = new mongoose.Schema({
  ceilingPrice:   { type: Number, default: null },
  floorPrice:     { type: Number, default: null },
  referencePrice: { type: Number, default: null }
}, { _id: false });

const discrepancyDetailSchema = new mongoose.Schema({
  field:              { type: String }, // ceilingPrice | floorPrice | referencePrice
  values: {
    kis:              { type: Number, default: null },
    vndirect:         { type: Number, default: null },
    tcbs:             { type: Number, default: null }
  },
  hasDiscrepancy:     { type: Boolean, default: false },
  maxDifference:      { type: Number, default: 0 },
  maxDifferencePercent: { type: Number, default: 0 }
}, { _id: false });

const comparisonSchema = new mongoose.Schema({
  symbol:           { type: String, required: true, uppercase: true },
  date:             { type: String, required: true }, // YYYY-MM-DD
  exchange:         { type: String, default: null },

  kis:              { type: priceSnapshotSchema, default: {} },
  vndirect:         { type: priceSnapshotSchema, default: {} },
  tcbs:             { type: priceSnapshotSchema, default: {} },

  discrepancies:    { type: [discrepancyDetailSchema], default: [] },
  hasDiscrepancy:   { type: Boolean, default: false, index: true },
  discrepancyCount: { type: Number, default: 0 },

  comparedAt:       { type: Date, default: Date.now }
});

comparisonSchema.index({ symbol: 1, date: 1 }, { unique: true });
comparisonSchema.index({ date: 1, hasDiscrepancy: 1 });

module.exports = mongoose.model('Comparison', comparisonSchema);
