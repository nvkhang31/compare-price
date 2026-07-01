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

// Parse "08:15,15:30" → [{ time, cronExpr }]
function parseSyncTimes(envValue) {
  const times = (envValue || '15:30').split(',').map(s => s.trim()).filter(Boolean);
  return times.map(time => {
    const [hour, minute] = time.split(':');
    return { time, cronExpr: `${parseInt(minute)} ${parseInt(hour)} * * 1-5` };
  });
}

async function runDailySync() {
  const date      = new Date().toISOString().split('T')[0];
  const startTime = Date.now();
  const summary   = { date, kis: null, vps: null, kbs: null, vndirect: null, tcbs: null, vci: null, comparison: null, alerts: 0 };

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

  // 2. VPS — dùng symbols từ KIS làm danh sách
  try {
    const symbols = await StockPrice.distinct('symbol', { date, source: 'kis' });
    summary.vps   = await vpsService.syncPrices(date, symbols);
    console.log(`[DailySync] VPS done:`, summary.vps);
  } catch (e) {
    summary.vps = { error: e.message };
    console.error(`[DailySync] VPS failed:`, e.message);
  }

  // 3. KBS — dùng symbols từ KIS làm danh sách
  try {
    const symbols = await StockPrice.distinct('symbol', { date, source: 'kis' });
    summary.kbs   = await kbsService.syncPrices(date, symbols);
    console.log(`[DailySync] KBS done:`, summary.kbs);
  } catch (e) {
    summary.kbs = { error: e.message };
    console.error(`[DailySync] KBS failed:`, e.message);
  }

  // 4. VNDirect
  try {
    summary.vndirect = await vndirectService.syncPrices(date);
    console.log(`[DailySync] VNDirect done:`, summary.vndirect);
  } catch (e) {
    summary.vndirect = { error: e.message };
    console.error(`[DailySync] VNDirect failed:`, e.message);
  }

  // 5. TCBS — lấy symbols từ KIS đã sync
  try {
    const symbols    = await StockPrice.distinct('symbol', { date, source: 'kis' });
    summary.tcbs     = await tcbsService.syncPrices(date, symbols);
    console.log(`[DailySync] TCBS done:`, summary.tcbs);
  } catch (e) {
    summary.tcbs = { error: e.message };
    console.error(`[DailySync] TCBS failed:`, e.message);
  }

  // 5b. VCI — lấy symbols từ KIS đã sync
  try {
    const symbols = await StockPrice.distinct('symbol', { date, source: 'kis' });
    summary.vci   = await vciService.syncPrices(date, symbols);
    console.log(`[DailySync] VCI done:`, summary.vci);
  } catch (e) {
    summary.vci = { error: e.message };
    console.error(`[DailySync] VCI failed:`, e.message);
  }

  // 6. Comparison — delay 3s để đảm bảo tất cả bulk writes đã được index trên Atlas
  await new Promise(r => setTimeout(r, 3000));
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

  // 8. Slack notification — gửi khi có sai lệch
  try {
    if (discrepant.length > 0) {
      const result = await slackService.sendDiscrepancyAlert({ date, discrepant, summary });
      if (result.skipped) {
        console.log('[DailySync] Slack skipped (not configured)');
      } else {
        console.log(`[DailySync] Slack sent — ${discrepant.length} discrepancies notified`);
      }
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
      runDailySync().catch(err =>
        console.error('[DailySync] Unhandled error:', err.message)
      );
    }, { timezone: 'Asia/Ho_Chi_Minh' });
  });
}

module.exports = { startScheduler, runDailySync };
