const axios = require('axios');
const StockPrice = require('../models/StockPrice');
const { withRetry } = require('../utils/retryUtil');

const PAGE_SIZE = 1000;

class VNDirectService {
  constructor() {
    this.baseURL = process.env.VNDIRECT_API_URL || 'https://finfo-api.vndirect.com.vn';
    this.timeout = 30000;
  }

  async fetchPage(date, page) {
    const response = await withRetry(() =>
      axios.get(`${this.baseURL}/v4/stock_prices/`, {
        params: {
          q:    `date:${date}`,
          sort: 'date',
          size: PAGE_SIZE,
          page
        },
        timeout: this.timeout,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    );
    return response.data;
  }

  async fetchAllPrices(date) {
    const first      = await this.fetchPage(date, 1);
    const total      = first.total || 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const allData    = [...(first.data || [])];

    for (let page = 2; page <= totalPages; page++) {
      const result = await this.fetchPage(date, page);
      allData.push(...(result.data || []));
      await new Promise(r => setTimeout(r, 500));
    }

    return allData;
  }

  transform(item, date) {
    return {
      symbol:         item.code,
      date,
      source:         'vndirect',
      exchange:       item.floor || null,
      ceilingPrice:   item.ceilingPrice  != null ? parseFloat(item.ceilingPrice)  : null,
      floorPrice:     item.floorPrice    != null ? parseFloat(item.floorPrice)    : null,
      referencePrice: item.basicPrice    != null ? parseFloat(item.basicPrice)    : null,
      closePrice:     item.close         != null ? parseFloat(item.close)         : null,
      volume:         item.nmVolume      != null ? parseInt(item.nmVolume)        : null,
      value:          item.nmValue       != null ? parseInt(item.nmValue)         : null,
      syncedAt:       new Date()
    };
  }

  async syncPrices(date) {
    const raw = await this.fetchAllPrices(date);
    if (!raw.length) return { total: 0, upserted: 0, modified: 0 };

    const docs = raw.map(item => this.transform(item, date));

    const ops = docs.map(doc => ({
      updateOne: {
        filter: { symbol: doc.symbol, date: doc.date, source: 'vndirect' },
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

module.exports = new VNDirectService();
