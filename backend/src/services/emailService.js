const nodemailer = require('nodemailer');

const PRICE_FIELD_LABELS = {
  ceilingPrice:   'Giá Trần',
  floorPrice:     'Giá Sàn',
  referencePrice: 'Giá TC'
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
  warning:  { label: 'Warning',  color: '#d97706', bg: '#fffbeb' },
  info:     { label: 'Info',     color: '#2563eb', bg: '#eff6ff' }
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

function buildDiscrepancyRows(discrepant) {
  const rows = [];

  for (const comp of discrepant) {
    for (const src of (comp.comparisons ?? [])) {
      if (!src.hasDiscrepancy) continue;

      for (const [fieldName, fieldLabel] of Object.entries(PRICE_FIELD_LABELS)) {
        const key   = fieldName === 'ceilingPrice' ? 'ceiling' : fieldName === 'floorPrice' ? 'floor' : 'reference';
        const field = src[key];
        if (!field || field.match !== false) continue;

        const severity = getSeverity(field.diffPct ?? 0);
        const cfg      = SEVERITY_CONFIG[severity];

        rows.push(`
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${comp.symbol}</td>
            <td style="padding: 10px 12px; color: #64748b;">${comp.exchange ?? '—'}</td>
            <td style="padding: 10px 12px; color: #64748b;">${SOURCE_LABELS[src.source] ?? src.source}</td>
            <td style="padding: 10px 12px; color: #64748b;">${fieldLabel}</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #1e293b;">${formatPrice(field.kisValue)}</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #dc2626;">${formatPrice(field.sourceValue)}</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: ${cfg.color};">${(field.diffPct ?? 0).toFixed(2)}%</td>
            <td style="padding: 10px 12px; text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; color: ${cfg.color}; background: ${cfg.bg};">
                ${cfg.label}
              </span>
            </td>
          </tr>`);
      }
    }
  }

  return rows.join('');
}

function buildEmailHtml({ date, discrepant, summary }) {
  const totalDiscrepancies = discrepant.length;
  const criticalCount = discrepant.filter(c =>
    c.comparisons?.some(s => s.hasDiscrepancy &&
      ['ceiling','floor','reference'].some(k => s[k]?.match === false && getSeverity(s[k].diffPct ?? 0) === 'critical')
    )
  ).length;

  const appUrl  = process.env.FRONTEND_URL || 'https://compare-price-blush.vercel.app';
  const dateVN  = new Date(date + 'T00:00:00+07:00').toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f8fafc; font-family: -apple-system, 'Segoe UI', sans-serif;">

  <div style="max-width: 680px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: #0f172a; padding: 24px 32px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="background: #3b82f6; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 18px; font-weight: bold;">K</span>
        </div>
        <div>
          <p style="margin:0; color: white; font-size: 16px; font-weight: 600;">KIS Price Comparison Tool</p>
          <p style="margin:0; color: #94a3b8; font-size: 12px;">Báo cáo sai lệch giá tự động</p>
        </div>
      </div>
    </div>

    <!-- Alert banner -->
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 32px; display: flex; gap: 12px; align-items: flex-start;">
      <span style="font-size: 20px;">⚠️</span>
      <div>
        <p style="margin: 0 0 4px; font-weight: 600; color: #991b1b; font-size: 14px;">Phát hiện sai lệch giá sau phiên giao dịch</p>
        <p style="margin: 0; color: #b91c1c; font-size: 13px;">${dateVN}</p>
      </div>
    </div>

    <!-- Summary stats -->
    <div style="padding: 24px 32px; border-bottom: 1px solid #f1f5f9;">
      <div style="display: flex; gap: 16px;">
        <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #dc2626;">${totalDiscrepancies}</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Mã sai lệch</p>
        </div>
        <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #dc2626;">${criticalCount}</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Critical</p>
        </div>
        <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #16a34a;">${summary.kis?.total ?? 0}</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Mã KIS</p>
        </div>
        <div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #2563eb;">${(summary.comparison?.matchRate ?? 100).toFixed(1)}%</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Match rate</p>
        </div>
      </div>
    </div>

    <!-- Discrepancy table -->
    <div style="padding: 24px 32px;">
      <p style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #1e293b;">Chi tiết sai lệch</p>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 560px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Mã</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Sàn</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Nguồn</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Loại giá</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; color: #3b82f6; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">KIS</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Nguồn</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Chênh lệch</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Mức độ</th>
            </tr>
          </thead>
          <tbody>
            ${buildDiscrepancyRows(discrepant)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- CTA -->
    <div style="padding: 8px 32px 28px; text-align: center;">
      <a href="${appUrl}/alerts"
        style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Xem và xử lý trên hệ thống →
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 32px; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        Email được gửi tự động bởi KIS Price Comparison Tool lúc 15:30 ICT các ngày làm việc.
      </p>
    </div>

  </div>
</body>
</html>`;
}

async function sendDiscrepancyEmail({ date, discrepant, summary }) {
  const from = process.env.EMAIL_FROM;
  const pass = process.env.EMAIL_PASS;
  const to   = process.env.EMAIL_TO;

  if (!from || !pass || !to) {
    console.warn('[EmailService] Skipping — EMAIL_FROM / EMAIL_PASS / EMAIL_TO not configured');
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: from, pass }
  });

  const dateVN = new Date(date + 'T00:00:00+07:00')
    .toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const info = await transporter.sendMail({
    from: `"KIS Price Tool" <${from}>`,
    to,
    subject: `[KIS] Phát hiện ${discrepant.length} mã sai lệch giá — ${dateVN}`,
    html: buildEmailHtml({ date, discrepant, summary })
  });

  console.log(`[EmailService] Sent to ${to} — messageId: ${info.messageId}`);
  return { sent: true, messageId: info.messageId };
}

module.exports = { sendDiscrepancyEmail };
