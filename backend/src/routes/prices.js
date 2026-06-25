const express          = require('express');
const router           = express.Router();
const StockPrice       = require('../models/StockPrice');
const AuditLog         = require('../models/AuditLog');
const kisService       = require('../services/kisService');
const vpsService       = require('../services/vpsService');
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

// POST /api/prices/sync — manual trigger (responds immediately, runs in background)
router.post('/sync', async (req, res, next) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    await AuditLog.create({ action: 'manual_sync_triggered', status: 'success', details: { date }, triggeredBy: 'api' });

    // Respond immediately so the HTTP request doesn't timeout
    res.json({ success: true, message: 'Sync started', date, note: 'Check /api/audit-logs for results' });

    // Run sync in background
    runSync(date).catch(err => console.error('[SyncRoute] Unhandled error:', err.message));
  } catch (err) { next(err); }
});

async function runSync(date) {
  const summary = { date, kis: null, vps: null, vndirect: null, tcbs: null, comparison: null, alerts: 0 };

  try { summary.kis = await kisService.syncPrices(date); }
  catch (e) { summary.kis = { error: e.message }; }

  try {
    const symbols = await StockPrice.distinct('symbol', { date, source: 'kis' });
    summary.vps   = await vpsService.syncPrices(date, symbols);
  } catch (e) { summary.vps = { error: e.message }; }

  try { summary.vndirect = await vndirectService.syncPrices(date); }
  catch (e) { summary.vndirect = { error: e.message }; }

  try {
    const symbols = await StockPrice.distinct('symbol', { date, source: 'kis' });
    summary.tcbs  = await tcbsService.syncPrices(date, symbols);
  } catch (e) { summary.tcbs = { error: e.message }; }

  try {
    summary.comparison = await comparisonService.compareAll(date);
    if (summary.comparison.withDiscrepancy > 0) {
      const discrepant = await Comparison.find({ date, hasDiscrepancy: true }).lean();
      summary.alerts   = await alertService.processAll(discrepant);
    }
  } catch (e) { summary.comparison = { error: e.message }; }

  await AuditLog.create({ action: 'daily_sync_completed', status: 'success', details: summary, triggeredBy: 'api' });
  console.log('[SyncRoute] Done:', JSON.stringify({ kis: summary.kis, vps: summary.vps, comparison: summary.comparison }));
}

module.exports = router;
