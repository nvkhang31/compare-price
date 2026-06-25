const axios = require('axios');
const StockPrice = require('../models/StockPrice');
const { withRetry } = require('../utils/retryUtil');

const CONCURRENCY = 10; // số request song song

class TCBSService {
  constructor() {
    this.baseURL = process.env.TCBS_API_URL || 'https://apipubaws.tcbs.com.vn';
    this.timeout = 15000;
  }

  async fetchQuote(symbol) {
    const response = await withRetry(() =>
      axios.get(`${this.baseURL}/tcanalysis/v1/ticker/${symbol}/overview`, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    , 2, 500);
    return response.data;
  }

  async fetchAllPrices(symbols) {
    const results = [];

    // Chia symbols thành các batch CONCURRENCY symbol/lần
    for (let i = 0; i < symbols.length; i += CONCURRENCY) {
      const batch   = symbols.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map(symbol => this.fetchQuote(symbol))
      );

      settled.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        } else {
          console.warn(`TCBS: skip ${batch[idx]} — ${r.reason?.message || 'no data'}`);
        }
      });

      // Tránh rate-limit giữa các batch
      if (i + CONCURRENCY < symbols.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    return results;
  }

  transform(item, date) {
    return {
      symbol:         item.ticker || item.symbol,
      date,
      source:         'tcbs',
      exchange:       item.exchange || null,
      ceilingPrice:   item.ceilingPrice != null ? parseFloat(item.ceilingPrice) : null,
      floorPrice:     item.floorPrice   != null ? parseFloat(item.floorPrice)   : null,
      referencePrice: item.refPrice     != null ? parseFloat(item.refPrice)     : null,
      closePrice:     item.lastPrice    != null ? parseFloat(item.lastPrice)    : null,
      volume:         item.totalVolume  != null ? parseInt(item.totalVolume)    : null,
      syncedAt:       new Date()
    };
  }

  async syncPrices(date, symbols) {
    if (!symbols || !symbols.length) return { total: 0, upserted: 0, modified: 0 };

    // Probe with 1 symbol to fast-fail if TCBS endpoint is down
    try {
      await axios.get(`${this.baseURL}/tcanalysis/v1/ticker/${symbols[0]}/overview`, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
    } catch (probeErr) {
      throw new Error(`TCBS endpoint unavailable: ${probeErr.message}`);
    }

    const raw  = await this.fetchAllPrices(symbols);
    if (!raw.length) return { total: 0, upserted: 0, modified: 0 };

    const docs = raw.map(item => this.transform(item, date));

    const ops = docs.map(doc => ({
      updateOne: {
        filter: { symbol: doc.symbol, date: doc.date, source: 'tcbs' },
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

module.exports = new TCBSService();
