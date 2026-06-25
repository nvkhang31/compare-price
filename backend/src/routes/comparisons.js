const express    = require('express');
const router     = express.Router();
const Comparison = require('../models/Comparison');
const StockPrice = require('../models/StockPrice');

// Danh sách VN30 (cập nhật theo kỳ review của HoSE)
const VN30_SYMBOLS = [
  'ACB','BCM','BID','BVH','CTG','FPT','GAS','GVR','HDB','HPG',
  'MBB','MSN','MWG','NVL','PDR','PLX','POW','SAB','SHB','SSI',
  'STB','TCB','TPB','VCB','VHM','VIB','VIC','VJC','VNM','VPB'
];

// GET /api/comparisons?date=2026-06-25&hasDiscrepancy=true&exchange=HOSE&vn30=true&symbol=ACB&limit=100&page=1
router.get('/', async (req, res, next) => {
  try {
    const { date, hasDiscrepancy, symbol, exchange, vn30, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (date)     filter.date     = date;
    if (symbol)   filter.symbol   = symbol.toUpperCase();
    if (vn30 === 'true') {
      filter.symbol = { $in: VN30_SYMBOLS };
    } else if (exchange) {
      filter.exchange = exchange.toUpperCase();
    }
    if (hasDiscrepancy !== undefined && hasDiscrepancy !== '')
      filter.hasDiscrepancy = hasDiscrepancy === 'true';

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Comparison.countDocuments(filter);
    const data  = await Comparison.find(filter)
      .sort({ symbol: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Các sources đang có data trong ngày (trừ KIS)
    const sourcesAvailable = date
      ? await StockPrice.distinct('source', { date, source: { $ne: 'kis' } })
      : [];

    res.json({
      success: true,
      total,
      page:            parseInt(page),
      limit:           parseInt(limit),
      sourcesAvailable,
      data
    });
  } catch (err) { next(err); }
});

// GET /api/comparisons/summary?date=2026-06-25
router.get('/summary', async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter   = date ? { date } : {};

    const [total, withDiscrepancy] = await Promise.all([
      Comparison.countDocuments(filter),
      Comparison.countDocuments({ ...filter, hasDiscrepancy: true })
    ]);

    res.json({
      success: true,
      data: {
        total,
        withDiscrepancy,
        matchRate: total > 0
          ? parseFloat(((total - withDiscrepancy) / total * 100).toFixed(2))
          : 100
      }
    });
  } catch (err) { next(err); }
});

// GET /api/comparisons/:symbol
router.get('/:symbol', async (req, res, next) => {
  try {
    const { symbol }     = req.params;
    const { limit = 30 } = req.query;
    const data = await Comparison.find({ symbol: symbol.toUpperCase() })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, total: data.length, data });
  } catch (err) { next(err); }
});

module.exports = router;
