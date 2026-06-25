const axios = require('axios');
const StockPrice = require('../models/StockPrice');
const { withRetry } = require('../utils/retryUtil');

class KISService {
  constructor() {
    this.staticDataURL = process.env.KIS_STATIC_DATA_URL;
    this.timeout = 30000;
  }

  async fetchAllPrices() {
    const response = await withRetry(() =>
      axios.get(this.staticDataURL, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    );
    // Only keep listed stocks — exclude FUTURES, BOND, ETF
    return response.data.filter(item => item.t === 'STOCK' && item.status === 'Listed');
  }

  transform(item, date) {
    return {
      symbol:         item.s,
      date,
      source:         'kis',
      exchange:       item.m || null,
      ceilingPrice:   item.ce != null ? item.ce : null,
      floorPrice:     item.fl != null ? item.fl : null,
      referencePrice: item.re != null ? item.re : null,
      syncedAt:       new Date()
    };
  }

  async syncPrices(date) {
    const raw  = await this.fetchAllPrices();
    if (!raw.length) return { total: 0, upserted: 0, modified: 0 };

    const docs = raw.map(item => this.transform(item, date));

    const ops = docs.map(doc => ({
      updateOne: {
        filter: { symbol: doc.symbol, date: doc.date, source: 'kis' },
        update:  { $set: doc },
        upsert:  true
      }
    }));

    const result = await StockPrice.bulkWrite(ops, { ordered: false });
    return {
      total:    docs.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount
    };
  }
}

module.exports = new KISService();
