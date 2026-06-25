const mongoose = require('mongoose');

const stockPriceSchema = new mongoose.Schema({
  symbol:         { type: String, required: true, uppercase: true, trim: true },
  date:           { type: String, required: true }, // YYYY-MM-DD
  source:         { type: String, required: true, enum: ['kis', 'vndirect', 'tcbs', 'vps'] },
  exchange:       { type: String, enum: ['HOSE', 'HNX', 'UPCOM'], default: null },

  ceilingPrice:   { type: Number, default: null },
  floorPrice:     { type: Number, default: null },
  referencePrice: { type: Number, default: null },

  openPrice:      { type: Number, default: null },
  highPrice:      { type: Number, default: null },
  lowPrice:       { type: Number, default: null },
  closePrice:     { type: Number, default: null },
  volume:         { type: Number, default: null },
  value:          { type: Number, default: null },

  syncedAt:       { type: Date, default: Date.now }
});

stockPriceSchema.index({ symbol: 1, date: 1, source: 1 }, { unique: true });
stockPriceSchema.index({ date: 1, source: 1 });

module.exports = mongoose.model('StockPrice', stockPriceSchema);
