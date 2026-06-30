const axios = require('axios');

const PRICE_FIELD_LABELS = {
  ceilingPrice:   'Giá Trần',
  floorPrice:     'Giá Sàn',
  referencePrice: 'Giá TC'
};

const SEVERITY_EMOJI = {
  critical: '🔴',
  warning:  '🟡',
  info:     '🔵'
};

const SOURCE_LABELS = { vps: 'VPS', kbs: 'KBS', vndirect: 'VNDirect', tcbs: 'TCBS', ssi: 'SSI' };

function getSeverity(diffPct) {
  const critical = parseFloat(process.env.ALERT_CRITICAL_THRESHOLD || 0.05) * 100;
  const warning  = parseFloat(process.env.ALERT_WARNING_THRESHOLD  || 0.01) * 100;
  if (diffPct >= critical) return 'critical';
  if (diffPct >= warning)  return 'warning';
  return 'info';
}

function formatPrice(val) {
  if (val == null) return '—';
  return val.toLocaleString('vi-VN');
}

// Gom discrepant records thành rows cho Slack table
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
          `${emoji} *${comp.symbol}* (${comp.exchange ?? '—'}) · ${SOURCE_LABELS[src.source] ?? src.source} · ${fieldLabel}` +
          ` | KIS: \`${formatPrice(field.kisValue)}\` → Nguồn: \`${formatPrice(field.sourceValue)}\`` +
          ` | *${(field.diffPct ?? 0).toFixed(2)}%*`
        );
      }
    }
  }

  return lines;
}

function buildSlackPayload({ date, discrepant, summary }) {
  const appUrl   = process.env.FRONTEND_URL || 'https://compare-price-blush.vercel.app';
  const dateVN   = new Date(date + 'T00:00:00+07:00')
    .toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  const totalDisc   = discrepant.length;
  const criticalCnt = discrepant.filter(c =>
    c.comparisons?.some(s => s.hasDiscrepancy &&
      ['ceiling', 'floor', 'reference'].some(k => s[k]?.match === false && getSeverity(s[k].diffPct ?? 0) === 'critical')
    )
  ).length;
  const matchRate   = (summary.comparison?.matchRate ?? 100).toFixed(1);
  const lines       = buildDiscrepancyLines(discrepant);

  // Chia nhỏ nếu quá nhiều dòng (Slack giới hạn 3000 ký tự/block)
  const MAX_LINES   = 20;
  const shownLines  = lines.slice(0, MAX_LINES);
  const hiddenCount = lines.length - shownLines.length;

  return {
    text: `⚠️ Phát hiện *${totalDisc} mã sai lệch giá* sau phiên giao dịch ${dateVN}`,
    blocks: [
      // Header
      {
        type: 'header',
        text: { type: 'plain_text', text: '⚠️ KIS Price Alert — Sai lệch giá sau phiên', emoji: true }
      },
      // Date + stats
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `📅 *Ngày giao dịch*\n${dateVN}` },
          { type: 'mrkdwn', text: `🔴 *Mã sai lệch*\n${totalDisc} mã` },
          { type: 'mrkdwn', text: `🚨 *Critical*\n${criticalCnt} mã` },
          { type: 'mrkdwn', text: `✅ *Match rate*\n${matchRate}%` }
        ]
      },
      { type: 'divider' },
      // Discrepancy list
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Chi tiết sai lệch:*\n${shownLines.join('\n')}` +
            (hiddenCount > 0 ? `\n_... và ${hiddenCount} sai lệch khác_` : '')
        }
      },
      { type: 'divider' },
      // CTA button
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔗 Xem và xử lý trên hệ thống', emoji: true },
            url: `${appUrl}/alerts`,
            style: 'primary'
          }
        ]
      },
      // Footer
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '🤖 Gửi tự động bởi KIS Price Comparison Tool lúc 15:30 ICT các ngày làm việc' }
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

module.exports = { sendDiscrepancyAlert };
