const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'daily_sync_started',
      'daily_sync_completed',
      'daily_sync_failed',
      'price_fetched',
      'comparison_completed',
      'alert_created',
      'alert_acknowledged',
      'alert_resolved',
      'manual_sync_triggered'
    ],
    required: true
  },

  status:   { type: String, enum: ['success', 'partial', 'failed'], required: true },

  details:  { type: mongoose.Schema.Types.Mixed, default: {} },

  triggeredBy: { type: String, default: 'system' },

  timestamp: { type: Date, default: Date.now }
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, status: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
