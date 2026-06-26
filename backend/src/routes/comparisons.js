const express    = require('express');
const router     = express.Router();
const Comparison = require('../models/Comparison');
const StockPrice = require('../models/StockPrice');

// Danh sách VN30 (cập nhật theo kỳ review của HoSE)
// VN30 cập nhật tháng 6/2026 (nguồn: HOSE)
const VN30_SYMBOLS = [
  // Ngân hàng (14)
  'ACB','BID','CTG','HDB','LPB','MBB','SHB','SSB','STB','TCB','TPB','VCB','VIB','VPB',
  // Bất động sản & Dịch vụ (4)
  'VIC','VHM','VRE','VPL',
  // Tiêu dùng & Công nghệ (5)
  'FPT','MSN','MWG','SAB','VNM',
  // Năng lượng & Tài nguyên (5)
  'GAS','GVR','HPG','PLX','DGC',
  // Tài chính & Hàng không (2)
  'SSI','VJC'
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
