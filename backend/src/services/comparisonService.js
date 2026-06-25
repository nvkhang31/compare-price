const StockPrice = require('../models/StockPrice');
const Comparison = require('../models/Comparison');

const FIELDS = ['ceilingPrice', 'floorPrice', 'referencePrice'];

class ComparisonService {

  // So sánh 1 field giữa các nguồn
  compareField(fieldName, values) {
    const entries = Object.entries(values).filter(([, v]) => v != null);
    if (entries.length < 2) {
      return { field: fieldName, values, hasDiscrepancy: false, maxDifference: 0, maxDifferencePercent: 0 };
    }

    const prices          = entries.map(([, v]) => v);
    const minPrice        = Math.min(...prices);
    const maxPrice        = Math.max(...prices);
    const maxDifference   = maxPrice - minPrice;
    const maxDifferencePercent = minPrice > 0
      ? parseFloat(((maxDifference / minPrice) * 100).toFixed(4))
      : 0;

    return {
      field: fieldName,
      values,
      hasDiscrepancy:      maxDifference > 0,
      maxDifference,
      maxDifferencePercent
    };
  }

  // So sánh 1 symbol từ DB
  async compareSymbol(symbol, date) {
    const [kisDoc, vndDoc, tcbsDoc] = await Promise.all([
      StockPrice.findOne({ symbol, date, source: 'kis' }).lean(),
      StockPrice.findOne({ symbol, date, source: 'vndirect' }).lean(),
      StockPrice.findOne({ symbol, date, source: 'tcbs' }).lean()
    ]);

    // Cần ít nhất 2 nguồn mới so sánh có ý nghĩa
    const availableSources = [kisDoc, vndDoc, tcbsDoc].filter(Boolean).length;
    if (availableSources < 2) return null;

    const discrepancies = FIELDS.map(field =>
      this.compareField(field, {
        ...(kisDoc  ? { kis:      kisDoc[field]  } : {}),
        ...(vndDoc  ? { vndirect: vndDoc[field]  } : {}),
        ...(tcbsDoc ? { tcbs:     tcbsDoc[field] } : {})
      })
    );

    const hasDiscrepancy   = discrepancies.some(d => d.hasDiscrepancy);
    const discrepancyCount = discrepancies.filter(d => d.hasDiscrepancy).length;

    const doc = {
      symbol,
      date,
      exchange: kisDoc?.exchange || vndDoc?.exchange || tcbsDoc?.exchange || null,
      kis:      kisDoc  ? { ceilingPrice: kisDoc.ceilingPrice,  floorPrice: kisDoc.floorPrice,  referencePrice: kisDoc.referencePrice  } : {},
      vndirect: vndDoc  ? { ceilingPrice: vndDoc.ceilingPrice,  floorPrice: vndDoc.floorPrice,  referencePrice: vndDoc.referencePrice  } : {},
      tcbs:     tcbsDoc ? { ceilingPrice: tcbsDoc.ceilingPrice, floorPrice: tcbsDoc.floorPrice, referencePrice: tcbsDoc.referencePrice } : {},
      discrepancies,
      hasDiscrepancy,
      discrepancyCount,
      comparedAt: new Date()
    };

    await Comparison.findOneAndUpdate(
      { symbol, date },
      { $set: doc },
      { upsert: true }
    );

    return doc;
  }

  // So sánh toàn bộ symbols cho 1 ngày
  async compareAll(date) {
    // Lấy danh sách symbols có data trong ngày
    const symbols = await StockPrice.distinct('symbol', { date });
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
