const StockPrice = require('../models/StockPrice');
const Comparison = require('../models/Comparison');

const COMPETITOR_SOURCES = ['vps', 'kbs', 'vndirect', 'tcbs', 'vci'];

class ComparisonService {

  compareField(kisValue, sourceValue) {
    if (kisValue == null || sourceValue == null) {
      return { kisValue, sourceValue, diff: null, diffPct: null, match: null };
    }
    const diff    = sourceValue - kisValue;
    const diffPct = kisValue > 0
      ? parseFloat((Math.abs(diff) / kisValue * 100).toFixed(4))
      : 0;
    return { kisValue, sourceValue, diff, diffPct, match: diff === 0 };
  }

  // So sánh 1 symbol: KIS là tham chiếu, từng source khác so với KIS
  async compareSymbol(symbol, date) {
    const kisDoc = await StockPrice.findOne({ symbol, date, source: 'kis' }).lean();
    if (!kisDoc) return null; // KIS bắt buộc phải có

    const competitorDocs = await Promise.all(
      COMPETITOR_SOURCES.map(src =>
        StockPrice.findOne({ symbol, date, source: src }).lean()
      )
    );

    const available = COMPETITOR_SOURCES
      .map((src, i) => ({ src, doc: competitorDocs[i] }))
      .filter(({ doc }) => doc != null);

    if (!available.length) return null; // Cần ít nhất 1 source khác để so sánh

    const comparisons = available.map(({ src, doc }) => {
      const ceiling   = this.compareField(kisDoc.ceilingPrice,   doc.ceilingPrice);
      const floor     = this.compareField(kisDoc.floorPrice,     doc.floorPrice);
      const reference = this.compareField(kisDoc.referencePrice, doc.referencePrice);
      const hasDiscrepancy = [ceiling, floor, reference].some(f => f.match === false);
      return { source: src, ceiling, floor, reference, hasDiscrepancy };
    });

    const hasDiscrepancy    = comparisons.some(c => c.hasDiscrepancy);
    const discrepantSources = comparisons.filter(c => c.hasDiscrepancy).map(c => c.source);

    const record = {
      symbol,
      date,
      exchange: kisDoc.exchange || null,
      kisPrice: {
        ceilingPrice:   kisDoc.ceilingPrice,
        floorPrice:     kisDoc.floorPrice,
        referencePrice: kisDoc.referencePrice
      },
      comparisons,
      sourcesCompared:   available.map(({ src }) => src),
      hasDiscrepancy,
      discrepantSources,
      comparedAt: new Date()
    };

    await Comparison.findOneAndUpdate(
      { symbol, date },
      { $set: record },
      { upsert: true }
    );

    return record;
  }

  // So sánh toàn bộ symbols cho 1 ngày
  async compareAll(date) {
    const symbols = await StockPrice.distinct('symbol', { date, source: 'kis' });
    if (!symbols.length) return { total: 0, compared: 0, withDiscrepancy: 0 };

    let compared        = 0;
    let withDiscrepancy = 0;

    for (const symbol of symbols) {
      const result = await this.compareSymbol(symbol, date);
      if (result) {
        compared++;
        if (result.hasDiscrepancy) withDiscrepancy++;
      }
    }

    return { total: symbols.length, compared, withDiscrepancy };
  }
}

module.exports = new ComparisonService();
