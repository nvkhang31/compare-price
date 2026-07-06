const cron             = require('node-cron');
const StockPrice       = require('../models/StockPrice');
const Comparison       = require('../models/Comparison');
const AuditLog         = require('../models/AuditLog');
const kisService       = require('../services/kisService');
const vpsService       = require('../services/vpsService');
const kbsService       = require('../services/kbsService');
const vndirectService  = require('../services/vndirectService');
const tcbsService      = require('../services/tcbsService');
const comparisonService = require('../services/comparisonService');
const alertService     = require('../services/alertService');
const vciService       = require('../services/vciService');
const slackService     = require('../services/slackService');
const indexService     = require('../services/indexService');

// Parse "08:15,15:30" → [{ time, cronExpr }]
function parseSyncTimes(envValue) {
  const times = (envValue || '15:30').split(',').map(s => s.trim()).filter(Boolean);
  return times.map(time => {
    const [hour, minute] = time.split(':');
    return { time, cronExpr: `${parseInt(minute)} ${parseInt(hour)} * * 1-5` };
  });
}

async function runDailySync(triggeredTime = null) {
  const date      = new Date().toISOString().split('T')[0];
  const startTime = Date.now();
  const summary   = { date, kis: null, vps: null, kbs: null, vndirect: null, tcbs: null, vci: null, comparison: null, alerts: 0 };

  console.log(`[DailySync] Starting for ${date}${triggeredTime ? ` (schedule: ${triggeredTime})` : ''}...`);

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

  // 1b. Refresh VN30 constituent list from KIS/VCI data
  try {
    await indexService.refreshVN30();
  } catch (e) {
    console.warn(`[DailySync] VN30 refresh failed (non-fatal):`, e.message);
  }

  // 2. Get KIS symbols once, then run all competitor sources in parallel
  const kisSymbols = await StockPrice.distinct('symbol', { date, source: 'kis' });

  const [vpsRes, vciRes, kbsRes, vndirectRes, tcbsRes] = await Promise.allSettled([
    vpsService.syncPrices(date, kisSymbols),
    vciService.syncPrices(date, kisSymbols),
    kbsService.syncPrices(date, kisSymbols),
    vndirectService.syncPrices(date),
    tcbsService.syncPrices(date, kisSymbols)
  ]);

  summary.vps      = vpsRes.status      === 'fulfilled' ? vpsRes.value      : { error: vpsRes.reason?.message };
  summary.vci      = vciRes.status      === 'fulfilled' ? vciRes.value      : { error: vciRes.reason?.message };
  summary.kbs      = kbsRes.status      === 'fulfilled' ? kbsRes.value      : { error: kbsRes.reason?.message };
  summary.vndirect = vndirectRes.status === 'fulfilled' ? vndirectRes.value : { error: vndirectRes.reason?.message };
  summary.tcbs     = tcbsRes.status     === 'fulfilled' ? tcbsRes.value     : { error: tcbsRes.reason?.message };

  console.log(`[DailySync] VPS:`, summary.vps);
  console.log(`[DailySync] VCI:`, summary.vci);
  console.log(`[DailySync] KBS:`, summary.kbs);
  console.log(`[DailySync] VNDirect:`, summary.vndirect);
  console.log(`[DailySync] TCBS:`, summary.tcbs);

  // 6. Comparison
  try {
    summary.comparison = await comparisonService.compareAll(date);
    console.log(`[DailySync] Comparison done:`, summary.comparison);
  } catch (e) {
    summary.comparison = { error: e.message };
    console.error(`[DailySync] Comparison failed:`, e.message);
  }

  // 7. Alerts + Email notification
  let discrepant = [];
  try {
    if (summary.comparison?.withDiscrepancy > 0) {
      discrepant     = await Comparison.find({ date, hasDiscrepancy: true }).lean();
      summary.alerts = await alertService.processAll(discrepant);
      console.log(`[DailySync] Alerts created: ${summary.alerts}`);
    }
  } catch (e) {
    console.error(`[DailySync] Alert failed:`, e.message);
  }

  // 8. Slack notification
  // - Morning sync (08:15): always send summary report
  // - Afternoon sync (15:30): only send if discrepancies found
  try {
    const hourICT   = triggeredTime
      ? parseInt(triggeredTime.split(':')[0])
      : (new Date().getUTCHours() + 7) % 24;
    const isMorning = hourICT < 12;
    if (isMorning) {
      const result = await slackService.sendMorningSummary({ date, summary });
      if (!result.skipped) console.log(`[DailySync] Slack morning summary sent`);
    } else if (discrepant.length > 0) {
      const result = await slackService.sendDiscrepancyAlert({ date, discrepant, summary });
      if (!result.skipped) console.log(`[DailySync] Slack alert sent — ${discrepant.length} discrepancies`);
    }
  } catch (e) {
    console.error(`[DailySync] Slack failed:`, e.message);
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

const ACTIVE_SOURCES = ['kis', 'vps', 'kbs', 'vci']; // cập nhật khi thêm/bớt source

function startScheduler() {
  if (process.env.DAILY_SYNC_ENABLED !== 'true') {
    console.log('[DailySync] Scheduler disabled (DAILY_SYNC_ENABLED != true)');
    return;
  }

  const schedules = parseSyncTimes(process.env.DAILY_SYNC_TIME);

  // Startup banner
  console.log('━'.repeat(52));
  console.log(`[DailySync] Scheduler READY`);
  schedules.forEach(({ time, cronExpr }) =>
    console.log(`[DailySync] Cron   : ${cronExpr} (${time} Mon–Fri ICT)`)
  );
  console.log(`[DailySync] Sources: ${ACTIVE_SOURCES.join(', ')}`);
  console.log('━'.repeat(52));

  AuditLog.create({
    action:      'scheduler_started',
    status:      'success',
    details:     { sources: ACTIVE_SOURCES, syncTimes: schedules.map(s => s.time) },
    triggeredBy: 'system'
  }).catch(() => {});

  schedules.forEach(({ time, cronExpr }) => {
    cron.schedule(cronExpr, () => {
      console.log(`[DailySync] Triggered by schedule: ${time}`);
      runDailySync(time).catch(err =>
        console.error('[DailySync] Unhandled error:', err.message)
      );
    }, { timezone: 'Asia/Ho_Chi_Minh' });
  });
}

module.exports = { startScheduler, runDailySync };
