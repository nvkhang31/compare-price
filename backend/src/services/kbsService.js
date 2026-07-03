const axios = require('axios');
const StockPrice = require('../models/StockPrice');

const BASE_URL = 'https://kbbuddywts.kbsec.com.vn/iis-server/investment';

class KBSService {
  constructor() {
    this.timeout = 10000;
  }

  async fetchAllPrices() {
    const response = await axios.get(`${BASE_URL}/stock/search/data`, {
      timeout: this.timeout,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return response.data || [];
  }

  // KBS giá đơn vị VND (khớp KIS), không cần convert
  transform(item, date) {
    return {
      symbol:         item.symbol,
      date,
      source:         'kbs',
      exchange:       item.exchange || null,
      ceilingPrice:   item.ceiling != null ? item.ceiling : null,
      floorPrice:     item.floor   != null ? item.floor   : null,
      referencePrice: item.re      != null ? item.re      : null,
      closePrice:     null,
      volume:         null,
      syncedAt:       new Date()
    };
  }

  async syncPrices(date, kisSymbols) {
    let raw;
    try {
      raw = await this.fetchAllPrices();
    } catch (err) {
      throw new Error(`KBS endpoint unavailable: ${err.message}`);
    }

    if (!raw.length) return { total: 0, upserted: 0, modified: 0 };

    // Chỉ lấy symbols mà KIS đã có để tránh sync data dư thừa
    const kisSet   = new Set((kisSymbols || []).map(s => s.toUpperCase()));
    const filtered = raw.filter(item =>
      item.symbol && item.type === 'stock' &&
      (kisSet.size === 0 || kisSet.has(item.symbol.toUpperCase()))
    );

    if (!filtered.length) return { total: 0, upserted: 0, modified: 0 };

    const docs = filtered.map(item => this.transform(item, date));

    const ops = docs.map(doc => ({
      updateOne: {
        filter: { symbol: doc.symbol, date: doc.date, source: 'kbs' },
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

module.exports = new KBSService();
