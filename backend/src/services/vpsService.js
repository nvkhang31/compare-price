const axios = require('axios');
const StockPrice = require('../models/StockPrice');
const { withRetry } = require('../utils/retryUtil');

const BATCH_SIZE = 200; // symbols per request
const BASE_URL   = 'https://bgapidatafeed.vps.com.vn/getliststockdata';

class VPSService {
  constructor() {
    this.timeout = 30000;
  }

  async fetchBatch(symbols) {
    const response = await withRetry(() =>
      axios.get(`${BASE_URL}/${symbols.join(',')}`, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    );
    // Chỉ lấy cổ phiếu thường (sType='S'), bỏ CW/phái sinh
    return (response.data || []).filter(item => item.sType === 'S' && item.sym);
  }

  async fetchAllPrices(symbols) {
    const results = [];

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      try {
        const data = await this.fetchBatch(batch);
        results.push(...data);
      } catch (e) {
        console.warn(`VPS batch ${i}–${i + BATCH_SIZE} failed: ${e.message}`);
      }
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Deduplicate theo sym (giữ bản ghi đầu tiên)
    const seen = new Set();
    return results.filter(item => {
      if (seen.has(item.sym)) return false;
      seen.add(item.sym);
      return true;
    });
  }

  // VPS giá đơn vị nghìn đồng → × 1000 để ra VND (khớp KIS)
  transform(item, date) {
    const toVND = v => (v != null && v !== '' ? Math.round(parseFloat(v) * 1000) : null);

    return {
      symbol:         item.sym,
      date,
      source:         'vps',
      exchange:       null, // sẽ enrich từ KIS nếu cần
      ceilingPrice:   toVND(item.c),
      floorPrice:     toVND(item.f),
      referencePrice: toVND(item.r),
      closePrice:     toVND(item.lastPrice),
      volume:         item.lot != null ? parseInt(item.lot) : null,
      syncedAt:       new Date()
    };
  }

  async syncPrices(date, symbols) {
    if (!symbols?.length) return { total: 0, upserted: 0, modified: 0 };

    const raw  = await this.fetchAllPrices(symbols);
    if (!raw.length) return { total: 0, upserted: 0, modified: 0 };

    const docs = raw.map(item => this.transform(item, date));

    const ops = docs.map(doc => ({
      updateOne: {
        filter: { symbol: doc.symbol, date: doc.date, source: 'vps' },
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

module.exports = new VPSService();
