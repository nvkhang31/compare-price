const express      = require('express');
const router       = express.Router();
const indexService = require('../services/indexService');
const Config       = require('../models/Config');

// GET /api/config/vn30 — return current VN30 list
router.get('/vn30', async (req, res, next) => {
  try {
    const symbols   = await indexService.getVN30Symbols();
    const config    = await Config.findOne({ key: 'vn30_symbols' }).lean();
    res.json({
      success:   true,
      count:     symbols.length,
      updatedAt: config?.updatedAt ?? null,
      symbols
    });
  } catch (err) { next(err); }
});

// POST /api/config/vn30/refresh — force refresh from KIS/VCI
router.post('/vn30/refresh', async (req, res, next) => {
  try {
    const symbols = await indexService.refreshVN30();
    res.json({ success: true, count: symbols.length, symbols });
  } catch (err) { next(err); }
});

// PUT /api/config/vn30 — manual override: { symbols: ['ACB', 'BID', ...] }
router.put('/vn30', async (req, res, next) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols) || symbols.length < 5) {
      return res.status(400).json({ success: false, error: 'symbols must be an array with at least 5 items' });
    }
    const upper = symbols.map(s => s.toUpperCase());
    await Config.findOneAndUpdate(
      { key: 'vn30_symbols' },
      { key: 'vn30_symbols', value: upper, updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true, count: upper.length, symbols: upper });
  } catch (err) { next(err); }
});

module.exports = router;
