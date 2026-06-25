const Alert    = require('../models/Alert');
const AuditLog = require('../models/AuditLog');

const CRITICAL_THRESHOLD = parseFloat(process.env.ALERT_CRITICAL_THRESHOLD || 0.05) * 100; // → %
const WARNING_THRESHOLD  = parseFloat(process.env.ALERT_WARNING_THRESHOLD  || 0.01) * 100;

class AlertService {

  getSeverity(differencePercent) {
    if (differencePercent >= CRITICAL_THRESHOLD) return 'critical';
    if (differencePercent >= WARNING_THRESHOLD)  return 'warning';
    return 'info';
  }

  // Tạo alerts từ kết quả 1 comparison
  async processComparison(comparison) {
    if (!comparison.hasDiscrepancy) return [];

    const created = [];

    for (const disc of comparison.discrepancies) {
      if (!disc.hasDiscrepancy) continue;

      const severity = this.getSeverity(disc.maxDifferencePercent);

      const alert = await Alert.findOneAndUpdate(
        {
          symbol:          comparison.symbol,
          date:            comparison.date,
          discrepancyType: disc.field,
          status:          { $in: ['open', 'acknowledged'] }
        },
        {
          $set: {
            symbol:            comparison.symbol,
            date:              comparison.date,
            exchange:          comparison.exchange,
            discrepancyType:   disc.field,
            severity,
            differenceAmount:  disc.maxDifference,
            differencePercent: disc.maxDifferencePercent,
            sources:           disc.values,
            status:            'open'
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, new: true }
      );

      created.push(alert);
    }

    return created;
  }

  // Xử lý toàn bộ comparisons có discrepancy
  async processAll(comparisons) {
    let totalAlerts = 0;

    for (const comparison of comparisons) {
      const alerts = await this.processComparison(comparison);
      totalAlerts += alerts.length;
    }

    if (totalAlerts > 0) {
      await AuditLog.create({
        action:  'alert_created',
        status:  'success',
        details: { alertsCreated: totalAlerts },
        triggeredBy: 'system'
      });
    }

    return totalAlerts;
  }
}

module.exports = new AlertService();
