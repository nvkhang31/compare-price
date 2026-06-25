const cron             = require('node-cron');
const StockPrice       = require('../models/StockPrice');
const Comparison       = require('../models/Comparison');
const AuditLog         = require('../models/AuditLog');
const kisService       = require('../services/kisService');
const vndirectService  = require('../services/vndirectService');
const tcbsService      = require('../services/tcbsService');
const comparisonService = require('../services/comparisonService');
const alertService     = require('../services/alertService');

// Đọc giờ sync từ env: "15:30" → cron "30 15 * * 1-5"
function buildCronExpression(timeStr) {
  const [hour, minute] = (timeStr || '15:30').split(':');
  return `${parseInt(minute)} ${parseInt(hour)} * * 1-5`; // Thứ 2–6
}

async function runDailySync() {
  const date      = new Date().toISOString().split('T')[0];
  const startTime = Date.now();
  const summary   = { date, kis: null, vndirect: null, tcbs: null, comparison: null, alerts: 0 };

  console.log(`[DailySync] Starting for ${date}...`);

  await AuditLog.create({
    action:      'daily_sync_started',
    status:      'success',
    details:     { date },
    triggeredBy: 'scheduler'
  });

  // 1. KIS
  try {
    summary.kis = await kisService.syncPrices(date);
    console.log(`[DailySync] KIS done:`, summary.kis);
  } catch (e) {
    summary.kis = { error: e.message };
    console.error(`[DailySync] KIS failed:`, e.message);
  }

  // 2. VNDirect
  try {
    summary.vndirect = await vndirectService.syncPrices(date);
    console.log(`[DailySync] VNDirect done:`, summary.vndirect);
  } catch (e) {
    summary.vndirect = { error: e.message };
    console.error(`[DailySync] VNDirect failed:`, e.message);
  }

  // 3. TCBS — lấy symbols từ KIS đã sync
  try {
    const symbols    = await StockPrice.distinct('symbol', { date, source: 'kis' });
    summary.tcbs     = await tcbsService.syncPrices(date, symbols);
    console.log(`[DailySync] TCBS done:`, summary.tcbs);
  } catch (e) {
    summary.tcbs = { error: e.message };
    console.error(`[DailySync] TCBS failed:`, e.message);
  }

  // 4. Comparison
  try {
    summary.comparison = await comparisonService.compareAll(date);
    console.log(`[DailySync] Comparison done:`, summary.comparison);
  } catch (e) {
    summary.comparison = { error: e.message };
    console.error(`[DailySync] Comparison failed:`, e.message);
  }

  // 5. Alerts
  try {
    if (summary.comparison?.withDiscrepancy > 0) {
      const discrepant  = await Comparison.find({ date, hasDiscrepancy: true }).lean();
      summary.alerts    = await alertService.processAll(discrepant);
      console.log(`[DailySync] Alerts created: ${summary.alerts}`);
    }
  } catch (e) {
    console.error(`[DailySync] Alert failed:`, e.message);
  }

  const duration = Date.now() - startTime;
  summary.durationMs = duration;

  await AuditLog.create({
    action:      'daily_sync_completed',
    status:      'success',
    details:     summary,
    triggeredBy: 'scheduler'
  });

  console.log(`[DailySync] Finished in ${duration}ms. Discrepancies: ${summary.comparison?.withDiscrepancy ?? 0}`);
}

function startScheduler() {
  if (process.env.DAILY_SYNC_ENABLED !== 'true') {
    console.log('[DailySync] Scheduler disabled (DAILY_SYNC_ENABLED != true)');
    return;
  }

  const cronExpr = buildCronExpression(process.env.DAILY_SYNC_TIME);
  console.log(`[DailySync] Scheduled at cron: "${cronExpr}" (${process.env.DAILY_SYNC_TIME} Mon–Fri)`);

  cron.schedule(cronExpr, () => {
    runDailySync().catch(err =>
      console.error('[DailySync] Unhandled error:', err.message)
    );
  }, { timezone: 'Asia/Ho_Chi_Minh' });
}

module.exports = { startScheduler, runDailySync };
