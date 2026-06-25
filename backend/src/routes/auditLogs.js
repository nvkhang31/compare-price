const express  = require('express');
const router   = express.Router();
const AuditLog = require('../models/AuditLog');

// GET /api/audit-logs?action=daily_sync_completed&status=success&limit=100
router.get('/', async (req, res, next) => {
  try {
    const { action, status, limit = 100, page = 1 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (status) filter.status = status;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(filter);
    const data  = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, total, page: parseInt(page), limit: parseInt(limit), data });
  } catch (err) { next(err); }
});

module.exports = router;
