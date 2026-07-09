const express       = require('express');
const router        = express.Router();
const Comparison    = require('../models/Comparison');
const StockPrice    = require('../models/StockPrice');
const indexService  = require('../services/indexService');

// GET /api/comparisons?date=2026-06-25&hasDiscrepancy=true&exchange=HOSE&vn30=true&symbol=ACB&limit=100&page=1
router.get('/', async (req, res, next) => {
  try {
    const { date, hasDiscrepancy, symbol, exchange, vn30, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (date)     filter.date     = date;
    if (symbol)   filter.symbol   = { $regex: `^${symbol.toUpperCase()}` };
    if (vn30 === 'true') {
      const vn30Symbols  = await indexService.getVN30Symbols();
      filter.symbol = { $in: vn30Symbols };
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

// GET /api/comparisons/analytics?date=2026-07-09
router.get('/analytics', async (req, res, next) => {
  try {
    const { date } = req.query
    const d = date || new Date().toISOString().split('T')[0]

    const [sourceStats, topSymbols] = await Promise.all([
      // Per-source discrepancy count
      Comparison.aggregate([
        { $match: { date: d, hasDiscrepancy: true } },
        { $unwind: '$discrepantSources' },
        { $group: { _id: '$discrepantSources', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, source: '$_id', count: 1 } }
      ]),
      // Top 10 symbols by max diffPct across all sources and fields
      Comparison.aggregate([
        { $match: { date: d, hasDiscrepancy: true } },
        {
          $addFields: {
            maxDiffPct: {
              $max: {
                $map: {
                  input: {
                    $filter: {
                      input: '$comparisons',
                      as: 'comp',
                      cond: '$$comp.hasDiscrepancy'
                    }
                  },
                  as: 'comp',
                  in: {
                    $max: [
                      { $abs: { $ifNull: ['$$comp.ceiling.diffPct',   0] } },
                      { $abs: { $ifNull: ['$$comp.floor.diffPct',     0] } },
                      { $abs: { $ifNull: ['$$comp.reference.diffPct', 0] } }
                    ]
                  }
                }
              }
            }
          }
        },
        { $sort: { maxDiffPct: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, symbol: 1, exchange: 1, maxDiffPct: 1, discrepantSources: 1 } }
      ])
    ])

    res.json({ success: true, data: { sourceStats, topSymbols } })
  } catch (err) { next(err) }
})

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
