const axios = require('axios');

const PRICE_FIELD_LABELS = {
  ceilingPrice:   'Ceiling Price',
  floorPrice:     'Floor Price',
  referencePrice: 'Reference Price'
};

const SEVERITY_EMOJI = {
  critical: ':red_circle:',
  warning:  ':large_yellow_circle:',
  info:     ':large_blue_circle:'
};

const SOURCE_LABELS = { vps: 'VPS', kbs: 'KBS', ssi: 'SSI', vci: 'VietCap' };

function getSeverity(diffPct) {
  const critical = parseFloat(process.env.ALERT_CRITICAL_THRESHOLD || 0.05) * 100;
  const warning  = parseFloat(process.env.ALERT_WARNING_THRESHOLD  || 0.01) * 100;
  if (diffPct >= critical) return 'critical';
  if (diffPct >= warning)  return 'warning';
  return 'info';
}

function formatPrice(val) {
  if (val == null) return '-';
  return val.toLocaleString('en-US');
}

function buildDiscrepancyLines(discrepant) {
  const lines = [];

  for (const comp of discrepant) {
    for (const src of (comp.comparisons ?? [])) {
      if (!src.hasDiscrepancy) continue;

      for (const [fieldName, fieldLabel] of Object.entries(PRICE_FIELD_LABELS)) {
        const key   = fieldName === 'ceilingPrice' ? 'ceiling' : fieldName === 'floorPrice' ? 'floor' : 'reference';
        const field = src[key];
        if (!field || field.match !== false) continue;

        const severity = getSeverity(field.diffPct ?? 0);
        const emoji    = SEVERITY_EMOJI[severity];

        lines.push(
          `${emoji} *${comp.symbol}* (${comp.exchange ?? '-'}) | ${SOURCE_LABELS[src.source] ?? src.source} | ${fieldLabel}` +
          ` | KIS: \`${formatPrice(field.kisValue)}\` vs Source: \`${formatPrice(field.sourceValue)}\`` +
          ` | *${(field.diffPct ?? 0).toFixed(2)}%*`
        );
      }
    }
  }

  return lines;
}

function buildSlackPayload({ date, discrepant, summary }) {
  const appUrl      = process.env.FRONTEND_URL || 'https://compare-price-blush.vercel.app';
  const dateFormatted = new Date(date + 'T00:00:00+07:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const totalDisc   = discrepant.length;
  const criticalCnt = discrepant.filter(c =>
    c.comparisons?.some(s => s.hasDiscrepancy &&
      ['ceiling', 'floor', 'reference'].some(k => s[k]?.match === false && getSeverity(s[k].diffPct ?? 0) === 'critical')
    )
  ).length;
  const matchRate   = (summary.comparison?.matchRate ?? 100).toFixed(1);
  const lines       = buildDiscrepancyLines(discrepant);

  const MAX_LINES   = 20;
  const shownLines  = lines.slice(0, MAX_LINES);
  const hiddenCount = lines.length - shownLines.length;

  return {
    text: `:warning: *${totalDisc} price discrepancies detected* after market close on ${dateFormatted}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':warning: KIS Price Alert — Post-Market Discrepancy Report', emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `:calendar: *Trading Date*\n${dateFormatted}` },
          { type: 'mrkdwn', text: `:red_circle: *Discrepant Symbols*\n${totalDisc}` },
          { type: 'mrkdwn', text: `:rotating_light: *Critical*\n${criticalCnt}` },
          { type: 'mrkdwn', text: `:white_check_mark: *Match Rate*\n${matchRate}%` }
        ]
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Discrepancy Details:*\n${shownLines.join('\n')}` +
            (hiddenCount > 0 ? `\n_... and ${hiddenCount} more discrepancies_` : '')
        }
      },
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View & Resolve Alerts', emoji: true },
            url: `${appUrl}/alerts`,
            style: 'primary'
          }
        ]
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: ':robot_face: Automated alert by KIS Price Comparison Tool | Daily sync at 15:30 ICT Mon-Fri' }
        ]
      }
    ]
  };
}

async function sendDiscrepancyAlert({ date, discrepant, summary }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[SlackService] Skipping — SLACK_WEBHOOK_URL not configured');
    return { skipped: true };
  }

  const payload = buildSlackPayload({ date, discrepant, summary });

  await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });

  console.log(`[SlackService] Sent — ${discrepant.length} discrepancies notified`);
  return { sent: true };
}

function buildSourceRow(key, data) {
  const label = SOURCE_LABELS[key] ?? key.toUpperCase();
  if (!data || data.error) {
    return { type: 'mrkdwn', text: `:x: *${label}*\n${data?.error ? 'Error' : 'No data'}` };
  }
  return { type: 'mrkdwn', text: `:white_check_mark: *${label}*\n${data.total.toLocaleString('en-US')} symbols` };
}

function buildMorningSummaryPayload({ date, summary }) {
  const appUrl        = process.env.FRONTEND_URL || 'https://compare-price-blush.vercel.app';
  const dateFormatted = new Date(date + 'T00:00:00+07:00')
    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const comp       = summary.comparison ?? {};
  const matched    = (comp.compared ?? 0) - (comp.withDiscrepancy ?? 0);
  const matchRate  = comp.compared > 0
    ? ((matched / comp.compared) * 100).toFixed(1)
    : '100.0';

  const sources    = ['kis', 'vps', 'vci', 'kbs'];
  const sourceFields = sources
    .filter(k => summary[k] !== undefined && summary[k] !== null)
    .map(k => buildSourceRow(k, summary[k]));

  return {
    text: `:sunrise: KIS Morning Price Summary — ${dateFormatted}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':sunrise: KIS Morning Price Summary — 08:15 ICT', emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `:calendar: *Trading Date*\n${dateFormatted}` },
          { type: 'mrkdwn', text: `:bar_chart: *Total Symbols*\n${(comp.total ?? 0).toLocaleString('en-US')}` },
          { type: 'mrkdwn', text: `:white_check_mark: *Matched*\n${matched.toLocaleString('en-US')} (${matchRate}%)` },
          { type: 'mrkdwn', text: comp.withDiscrepancy > 0
              ? `:red_circle: *Discrepant*\n${comp.withDiscrepancy}`
              : `:large_green_circle: *Discrepant*\n0`
          }
        ]
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Symbol Count per Source:*' }
      },
      {
        type: 'section',
        fields: sourceFields.slice(0, 6)
      },
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Price Comparisons', emoji: true },
            url: `${appUrl}/comparisons`,
            style: 'primary'
          }
        ]
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: ':robot_face: Automated morning sync by KIS Price Comparison Tool | 08:15 ICT Mon-Fri' }
        ]
      }
    ]
  };
}

async function sendMorningSummary({ date, summary }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[SlackService] Skipping morning summary — SLACK_WEBHOOK_URL not configured');
    return { skipped: true };
  }

  const payload = buildMorningSummaryPayload({ date, summary });
  await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
  });

  console.log(`[SlackService] Morning summary sent for ${date}`);
  return { sent: true };
}

module.exports = { sendDiscrepancyAlert, sendMorningSummary };
