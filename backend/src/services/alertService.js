const Alert    = require('../models/Alert');
const AuditLog = require('../models/AuditLog');

const CRITICAL_THRESHOLD = parseFloat(process.env.ALERT_CRITICAL_THRESHOLD || 0.05) * 100; // → %
const WARNING_THRESHOLD  = parseFloat(process.env.ALERT_WARNING_THRESHOLD  || 0.01) * 100;

const PRICE_FIELDS = [
  { name: 'ceilingPrice',   key: 'ceiling'   },
  { name: 'floorPrice',     key: 'floor'     },
  { name: 'referencePrice', key: 'reference' }
];

class AlertService {

  getSeverity(diffPct) {
    if (diffPct >= CRITICAL_THRESHOLD) return 'critical';
    if (diffPct >= WARNING_THRESHOLD)  return 'warning';
    return 'info';
  }

  // Tạo alerts từ 1 comparison record (KIS-centric schema)
  async processComparison(comparison) {
    if (!comparison.hasDiscrepancy) return [];

    const created = [];

    for (const comp of (comparison.comparisons ?? [])) {
      if (!comp.hasDiscrepancy) continue;

      for (const { name, key } of PRICE_FIELDS) {
        const field = comp[key];
        if (field?.match !== false) continue; // bỏ qua nếu khớp hoặc null

        const severity = this.getSeverity(field.diffPct ?? 0);

        const alert = await Alert.findOneAndUpdate(
          {
            symbol:           comparison.symbol,
            date:             comparison.date,
            discrepancyType:  name,
            'sources.source': comp.source,
            status:           { $in: ['open', 'acknowledged'] }
          },
          {
            $set: {
              symbol:            comparison.symbol,
              date:              comparison.date,
              exchange:          comparison.exchange,
              discrepancyType:   name,
              severity,
              differenceAmount:  field.diff,
              differencePercent: field.diffPct,
              sources: {
                source:      comp.source,
                kisValue:    field.kisValue,
                sourceValue: field.sourceValue
              },
              status: 'open'
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true, new: true }
        );

        created.push(alert);
      }
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
        action:      'alert_created',
        status:      'success',
        details:     { alertsCreated: totalAlerts },
        triggeredBy: 'system'
      });
    }

    return totalAlerts;
  }
}

module.exports = new AlertService();
