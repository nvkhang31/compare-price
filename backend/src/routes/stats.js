const express    = require('express');
const router     = express.Router();
const StockPrice = require('../models/StockPrice');
const Comparison = require('../models/Comparison');
const Alert      = require('../models/Alert');
const AuditLog   = require('../models/AuditLog');

// GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      symbolsTracked,
      sourcesAvailable,
      discrepanciesToday,
      comparisonTotal,
      openAlerts,
      criticalAlerts,
      lastSyncLog
    ] = await Promise.all([
      StockPrice.distinct('symbol', { date: today }),
      StockPrice.distinct('source', { date: today }),
      Comparison.countDocuments({ date: today, hasDiscrepancy: true }),
      Comparison.countDocuments({ date: today }),
      Alert.countDocuments({ status: 'open', date: today }),
      Alert.countDocuments({ status: 'open', severity: 'critical', date: today }),
      AuditLog.findOne({ action: 'daily_sync_completed' }).sort({ timestamp: -1 }).lean()
    ]);

    res.json({
      success: true,
      data: {
        symbolsTracked:    symbolsTracked.length,
        sourcesAvailable,
        discrepanciesToday,
        comparisonTotal,
        matchRate: comparisonTotal > 0
          ? parseFloat(((comparisonTotal - discrepanciesToday) / comparisonTotal * 100).toFixed(2))
          : null,
        openAlerts,
        criticalAlerts,
        lastSyncAt:  lastSyncLog?.timestamp ?? null,
        lastSyncDate: lastSyncLog?.details?.date ?? null
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
