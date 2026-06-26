const express          = require('express');
const router           = express.Router();
const StockPrice       = require('../models/StockPrice');
const AuditLog         = require('../models/AuditLog');
const comparisonService = require('../services/comparisonService');
const alertService     = require('../services/alertService');
const Comparison       = require('../models/Comparison');
const { runDailySync } = require('../schedulers/dailySync');

// GET /api/prices?symbol=ACB&source=kis&date=2026-06-25
router.get('/', async (req, res, next) => {
  try {
    const { symbol, source, date, limit = 100 } = req.query;
    const filter = {};
    if (symbol) filter.symbol = symbol.toUpperCase();
    if (source) filter.source = source;
    if (date)   filter.date   = date;

    const prices = await StockPrice.find(filter)
      .sort({ syncedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, total: prices.length, data: prices });
  } catch (err) { next(err); }
});

// POST /api/prices/sync — manual trigger (responds immediately, runs in background)
router.post('/sync', async (req, res, next) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    await AuditLog.create({ action: 'manual_sync_triggered', status: 'success', details: { date }, triggeredBy: 'api' });
    res.json({ success: true, message: 'Sync started', date, note: 'Check /api/audit-logs for results' });
  } catch (err) {
    return next(err);
  }

  // Gọi NGOÀI try-catch để lỗi không bị Express nuốt sau khi res đã gửi
  console.log('[SyncRoute] Triggering runDailySync, type:', typeof runDailySync);
  runDailySync().catch(err => console.error('[SyncRoute] runDailySync failed:', err.message));
});


// POST /api/prices/test-alert — inject discrepancy giả để test alert system
// Dùng trong dev, xóa sau khi xác nhận alert hoạt động
router.post('/test-alert', async (req, res, next) => {
  try {
    const date   = new Date().toISOString().split('T')[0];
    const symbol = (req.body.symbol || 'ACB').toUpperCase();

    // Lấy giá KIS thật
    const kisDoc = await StockPrice.findOne({ symbol, date, source: 'kis' }).lean();
    if (!kisDoc) return res.status(404).json({ success: false, error: `No KIS data for ${symbol} on ${date}` });

    // Tạo VPS record với giá trần sai lệch +2%
    const fakeVps = {
      ...kisDoc,
      _id:           undefined,
      source:        'vps',
      ceilingPrice:  Math.round(kisDoc.ceilingPrice * 1.02), // +2% — vượt WARNING threshold (1%)
      syncedAt:      new Date()
    };
    await StockPrice.findOneAndUpdate(
      { symbol, date, source: 'vps' },
      { $set: fakeVps },
      { upsert: true }
    );

    // Chạy comparison cho symbol này
    const comparison = await comparisonService.compareSymbol(symbol, date);

    // Tạo alert
    let alerts = 0;
    if (comparison?.hasDiscrepancy) {
      alerts = await alertService.processAll([comparison]);
    }

    res.json({ success: true, symbol, fakeVpsCeiling: fakeVps.ceilingPrice, kisValue: kisDoc.ceilingPrice, hasDiscrepancy: comparison?.hasDiscrepancy, alertsCreated: alerts });
  } catch (err) { next(err); }
});

module.exports = router;
