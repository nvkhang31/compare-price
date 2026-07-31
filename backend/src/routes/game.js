const express    = require('express');
const router     = express.Router();
const Comparison = require('../models/Comparison');

function toDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// GET /api/game/question
// Returns a random symbol question: show symbol + exchange, answer is whether
// today's KIS reference price went up or down vs yesterday's.
router.get('/question', async (req, res, next) => {
  try {
    const today     = toDateStr(0);
    const yesterday = toDateStr(-1);

    // Get all symbols that have data for both today and yesterday
    const [todaySymbols, yesterdaySymbols] = await Promise.all([
      Comparison.distinct('symbol', { date: today,     'kisPrice.referencePrice': { $gt: 0 } }),
      Comparison.distinct('symbol', { date: yesterday, 'kisPrice.referencePrice': { $gt: 0 } })
    ]);

    const yesterdaySet = new Set(yesterdaySymbols);
    const eligible     = todaySymbols.filter(s => yesterdaySet.has(s));

    if (eligible.length === 0) {
      return res.status(404).json({ success: false, error: 'No eligible symbols found' });
    }

    const symbol = eligible[Math.floor(Math.random() * eligible.length)];

    const [todayDoc, yesterdayDoc] = await Promise.all([
      Comparison.findOne({ symbol, date: today     }, 'exchange kisPrice').lean(),
      Comparison.findOne({ symbol, date: yesterday }, 'kisPrice').lean()
    ]);

    const todayRef     = todayDoc?.kisPrice?.referencePrice;
    const yesterdayRef = yesterdayDoc?.kisPrice?.referencePrice;

    if (!todayRef || !yesterdayRef) {
      return res.status(404).json({ success: false, error: 'Missing price data' });
    }

    const answer = todayRef >= yesterdayRef ? 'bull' : 'bear';

    res.json({
      success: true,
      symbol,
      exchange: todayDoc.exchange ?? '—',
      answer
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
