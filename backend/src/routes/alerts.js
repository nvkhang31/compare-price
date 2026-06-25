const express = require('express');
const router  = express.Router();
const Alert   = require('../models/Alert');
const AuditLog = require('../models/AuditLog');

// GET /api/alerts?status=open&severity=critical&limit=50
router.get('/', async (req, res, next) => {
  try {
    const { status, severity, symbol, date, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (severity) filter.severity = severity;
    if (symbol)   filter.symbol   = symbol.toUpperCase();
    if (date)     filter.date     = date;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Alert.countDocuments(filter);
    const data  = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, total, page: parseInt(page), limit: parseInt(limit), data });
  } catch (err) { next(err); }
});

// GET /api/alerts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id).lean();
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

// PUT /api/alerts/:id/acknowledge
router.put('/:id/acknowledge', async (req, res, next) => {
  try {
    const { acknowledgedBy = 'user', notes } = req.body;
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'acknowledged', acknowledgedBy, acknowledgedAt: new Date() } },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });

    await AuditLog.create({ action: 'alert_acknowledged', status: 'success', details: { alertId: req.params.id, acknowledgedBy, notes }, triggeredBy: acknowledgedBy });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', async (req, res, next) => {
  try {
    const { resolvedBy = 'user', resolution } = req.body;
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'resolved', resolvedBy, resolvedAt: new Date(), resolution } },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });

    await AuditLog.create({ action: 'alert_resolved', status: 'success', details: { alertId: req.params.id, resolvedBy, resolution }, triggeredBy: resolvedBy });
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

module.exports = router;
