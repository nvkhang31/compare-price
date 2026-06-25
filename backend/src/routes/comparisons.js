const express    = require('express');
const router     = express.Router();
const Comparison = require('../models/Comparison');

// GET /api/comparisons?date=2026-06-25&hasDiscrepancy=true&limit=100&page=1
router.get('/', async (req, res, next) => {
  try {
    const { date, hasDiscrepancy, symbol, exchange, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (date)            filter.date           = date;
    if (symbol)          filter.symbol         = symbol.toUpperCase();
    if (exchange)        filter.exchange       = exchange.toUpperCase();
    if (hasDiscrepancy !== undefined)
      filter.hasDiscrepancy = hasDiscrepancy === 'true';

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Comparison.countDocuments(filter);
    const data  = await Comparison.find(filter)
      .sort({ comparedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, total, page: parseInt(page), limit: parseInt(limit), data });
  } catch (err) { next(err); }
});

// GET /api/comparisons/summary
router.get('/summary', async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter   = date ? { date } : {};

    const [total, withDiscrepancy] = await Promise.all([
      Comparison.countDocuments(filter),
      Comparison.countDocuments({ ...filter, hasDiscrepancy: true })
    ]);

    const bySeverityPipeline = [
      { $match: { ...filter, hasDiscrepancy: true } },
      { $unwind: '$discrepancies' },
      { $match: { 'discrepancies.hasDiscrepancy': true } },
      { $group: { _id: null, critical: { $sum: { $cond: [{ $gte: ['$discrepancies.maxDifferencePercent', 5] }, 1, 0] } }, warning: { $sum: { $cond: [{ $and: [{ $gte: ['$discrepancies.maxDifferencePercent', 1] }, { $lt: ['$discrepancies.maxDifferencePercent', 5] }] }, 1, 0] } }, info: { $sum: { $cond: [{ $lt: ['$discrepancies.maxDifferencePercent', 1] }, 1, 0] } } } }
    ];

    const severityResult = await Comparison.aggregate(bySeverityPipeline);

    res.json({
      success: true,
      data: {
        total,
        withDiscrepancy,
        matchRate: total > 0 ? parseFloat(((total - withDiscrepancy) / total * 100).toFixed(2)) : 100,
        bySeverity: severityResult[0] || { critical: 0, warning: 0, info: 0 }
      }
    });
  } catch (err) { next(err); }
});

// GET /api/comparisons/:symbol
router.get('/:symbol', async (req, res, next) => {
  try {
    const { symbol }       = req.params;
    const { limit = 30 }   = req.query;
    const data = await Comparison.find({ symbol: symbol.toUpperCase() })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, total: data.length, data });
  } catch (err) { next(err); }
});

module.exports = router;
