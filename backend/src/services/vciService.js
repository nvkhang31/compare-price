const axios = require('axios');
const StockPrice = require('../models/StockPrice');
const { withRetry } = require('../utils/retryUtil');

const BASE_URL   = 'https://trading.vietcap.com.vn/api/price/symbols/getList';
const BATCH_SIZE = 200;

const BOARD_MAP = { HSX: 'HOSE', HNX: 'HNX', UPCoM: 'UPCOM', UPCOM: 'UPCOM' };

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  'Referer':      'https://trading.vietcap.com.vn/',
  'Origin':       'https://trading.vietcap.com.vn'
};

class VCIService {
  constructor() {
    this.timeout = 30000;
  }

  async fetchBatch(symbols) {
    const response = await withRetry(() =>
      axios.post(BASE_URL, { symbols }, { timeout: this.timeout, headers: HEADERS })
    );
    return (response.data || []).filter(item =>
      item?.listingInfo?.type === 'STOCK' && item?.listingInfo?.symbol
    );
  }

  async fetchAllPrices(symbols) {
    const results = [];
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      try {
        const data = await this.fetchBatch(batch);
        results.push(...data);
      } catch (e) {
        console.warn(`VCI batch ${i}–${i + BATCH_SIZE} failed: ${e.message}`);
      }
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    return results;
  }

  transform(item, date) {
    const info = item.listingInfo;
    return {
      symbol:         info.symbol,
      date,
      source:         'vci',
      exchange:       BOARD_MAP[info.board] ?? info.board ?? null,
      ceilingPrice:   info.ceiling   ?? null,
      floorPrice:     info.floor     ?? null,
      referencePrice: info.refPrice  ?? null,
      closePrice:     item.matchPrice?.matchPrice ?? null,
      volume:         item.matchPrice?.accumulatedVolume ?? null,
      syncedAt:       new Date()
    };
  }

  async syncPrices(date, kisSymbols) {
    if (!kisSymbols?.length) return { total: 0, upserted: 0, modified: 0 };

    let raw;
    try {
      raw = await this.fetchAllPrices(kisSymbols);
    } catch (err) {
      throw new Error(`VCI endpoint unavailable: ${err.message}`);
    }

    if (!raw.length) return { total: 0, upserted: 0, modified: 0 };

    const docs = raw.map(item => this.transform(item, date));

    const ops = docs.map(doc => ({
      updateOne: {
        filter: { symbol: doc.symbol, date: doc.date, source: 'vci' },
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

module.exports = new VCIService();
