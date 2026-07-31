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

// GET /api/comparisons/reliability?days=7
router.get('/reliability', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7
    const dates = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }

    // For each date, find which sources had any discrepancy that day
    const rows = await Comparison.aggregate([
      { $match: { date: { $in: dates }, hasDiscrepancy: true } },
      { $unwind: '$discrepantSources' },
      { $group: { _id: { date: '$date', source: '$discrepantSources' } } },
      { $group: { _id: '$_id.source', discrepantDays: { $sum: 1 } } },
      { $project: { _id: 0, source: '$_id', discrepantDays: 1 } }
    ])

    // Find which sources had data on any of those dates
    const sourcesWithData = await Comparison.aggregate([
      { $match: { date: { $in: dates } } },
      { $unwind: '$discrepantSources' },
      { $group: { _id: '$discrepantSources' } },
      { $project: { _id: 0, source: '$_id' } }
    ])

    // Also get all sources that appeared as discrepant (they had data)
    const allSources = [...new Set([
      ...rows.map(r => r.source),
      ...sourcesWithData.map(s => s.source)
    ])]

    const discMap = Object.fromEntries(rows.map(r => [r.source, r.discrepantDays]))

    const result = allSources.map(source => {
      const discrepantDays = discMap[source] ?? 0
      const cleanDays = days - discrepantDays
      return {
        source,
        cleanDays,
        totalDays: days,
        reliabilityPct: parseFloat((cleanDays / days * 100).toFixed(1))
      }
    }).sort((a, b) => b.reliabilityPct - a.reliabilityPct)

    res.json({ success: true, data: { reliability: result, days } })
  } catch (err) { next(err) }
})

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
