const express          = require('express');
const router           = express.Router();
const StockPrice       = require('../models/StockPrice');
const AuditLog         = require('../models/AuditLog');
const kisService       = require('../services/kisService');
const vndirectService  = require('../services/vndirectService');
const tcbsService      = require('../services/tcbsService');
const comparisonService = require('../services/comparisonService');
const alertService     = require('../services/alertService');
const Comparison       = require('../models/Comparison');

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

// POST /api/prices/sync — manual trigger
router.post('/sync', async (req, res, next) => {
  try {
    const date    = new Date().toISOString().split('T')[0];
    const summary = { date, kis: null, vndirect: null, tcbs: null, comparison: null, alerts: 0 };

    await AuditLog.create({ action: 'manual_sync_triggered', status: 'success', details: { date }, triggeredBy: 'api' });

    // KIS
    try {
      summary.kis = await kisService.syncPrices(date);
    } catch (e) {
      summary.kis = { error: e.message };
    }

    // VNDirect
    try {
      summary.vndirect = await vndirectService.syncPrices(date);
    } catch (e) {
      summary.vndirect = { error: e.message };
    }

    // TCBS — cần danh sách symbols từ KIS
    try {
      const symbols = await StockPrice.distinct('symbol', { date, source: 'kis' });
      summary.tcbs  = await tcbsService.syncPrices(date, symbols);
    } catch (e) {
      summary.tcbs = { error: e.message };
    }

    // Comparison
    const compResult = await comparisonService.compareAll(date);
    summary.comparison = compResult;

    // Alerts — lấy các comparison có discrepancy
    if (compResult.withDiscrepancy > 0) {
      const discrepantComparisons = await Comparison.find({ date, hasDiscrepancy: true }).lean();
      summary.alerts = await alertService.processAll(discrepantComparisons);
    }

    await AuditLog.create({
      action:  'daily_sync_completed',
      status:  'success',
      details: summary,
      triggeredBy: 'api'
    });

    res.json({ success: true, summary });
  } catch (err) { next(err); }
});

module.exports = router;
