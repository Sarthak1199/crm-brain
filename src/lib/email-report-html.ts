import { formatInr, formatNumber, formatDate } from "@/lib/format";
import type { EmailReportData } from "@/lib/report-data";

// Table-based layout with inline styles throughout, plus inline SVG bar
// charts — email clients (Gmail especially, the client actually in use
// here) strip <style> blocks and don't reliably support flexbox/grid, so
// this deliberately doesn't reuse any of the dashboard's own
// Tailwind/Recharts components. Inline SVG (not an <img>) keeps the whole
// message a few KB, nowhere near Gmail's ~102KB clip threshold that a
// full-page screenshot attachment used to hit.

const BRAND = "#1188EF";
const AMBER = "#F59E0B";
const EMERALD = "#10B981";
const VIOLET = "#8B5CF6";
const INK = "#0B1220";
const MUTED = "#64748B";
const BORDER = "#E5E9F0";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F8FAFC";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A plain horizontal bar chart, hand-built as inline SVG — no chart lib
// needed for three or four bars, and it keeps the whole email dependency
// free.
function barChartSvg(items: { label: string; value: number; display: string; color: string }[]): string {
  const barHeight = 20;
  const gap = 12;
  const labelWidth = 130;
  const chartWidth = 260;
  const rightPad = 70;
  const width = labelWidth + chartWidth + rightPad;
  const height = items.length * (barHeight + gap) - gap;
  const max = Math.max(...items.map((i) => i.value), 1);

  const bars = items
    .map((item, i) => {
      const y = i * (barHeight + gap);
      const w = Math.max((item.value / max) * chartWidth, 3);
      return `
        <text x="0" y="${y + barHeight / 2 + 4}" font-size="12" fill="${MUTED}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">${esc(item.label)}</text>
        <rect x="${labelWidth}" y="${y}" width="${w}" height="${barHeight}" rx="4" fill="${item.color}" />
        <text x="${labelWidth + w + 8}" y="${y + barHeight / 2 + 4}" font-size="12" font-weight="600" fill="${INK}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">${esc(item.display)}</text>
      `;
    })
    .join("");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function kpiCell(label: string, value: string, accent: string, sub?: string) {
  return `
    <td style="padding:6px" valign="top">
      <div style="border:1px solid ${BORDER};border-top:3px solid ${accent};border-radius:10px;padding:14px;background:${CARD_BG}">
        <div style="font-size:12px;color:${MUTED};margin-bottom:4px">${label}</div>
        <div style="font-size:20px;font-weight:700;color:${INK};line-height:1.2">${value}</div>
        ${sub ? `<div style="font-size:11px;color:${MUTED};margin-top:2px">${sub}</div>` : ""}
      </div>
    </td>
  `;
}

function kpiRow(cells: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells.join("")}</tr></table>`;
}

function pendingClosedRow(label: string, pending: string, closed: string) {
  return `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:${INK};border-bottom:1px solid ${BORDER}">${label}</td>
      <td style="padding:8px 0;font-size:13px;font-weight:600;color:${EMERALD};text-align:right;border-bottom:1px solid ${BORDER}">${closed}</td>
      <td style="padding:8px 0;font-size:13px;font-weight:600;color:${AMBER};text-align:right;border-bottom:1px solid ${BORDER}">${pending}</td>
    </tr>
  `;
}

function sectionTitle(title: string, subtitle?: string) {
  return `
    <div style="margin:28px 0 12px">
      <div style="font-size:15px;font-weight:700;color:${INK}">${title}</div>
      ${subtitle ? `<div style="font-size:11px;color:${MUTED};margin-top:2px">${subtitle}</div>` : ""}
    </div>
  `;
}

function card(inner: string) {
  return `<div style="border:1px solid ${BORDER};border-radius:10px;padding:14px">${inner}</div>`;
}

export function buildReportHtml(data: EmailReportData, dashboardUrl: string): string {
  const { sales, potentialClosure, credit, arpu, adoption } = data;

  const creditByCategoryChart = barChartSvg([
    { label: "Automation", value: credit.automation, display: formatInr(credit.automation, { compact: true }), color: BRAND },
    { label: "Campaigns", value: credit.campaigns, display: formatInr(credit.campaigns, { compact: true }), color: AMBER },
    { label: "Loyalty", value: credit.loyalty, display: formatInr(credit.loyalty, { compact: true }), color: EMERALD },
  ]);

  const pendingClosedInrChart = barChartSvg([
    { label: "Closed", value: potentialClosure.inr.closed, display: formatInr(potentialClosure.inr.closed, { compact: true }), color: EMERALD },
    { label: "Pending", value: potentialClosure.inr.pending, display: formatInr(potentialClosure.inr.pending, { compact: true }), color: AMBER },
  ]);

  // Credit consumption and adoption are both sourced from once-a-week
  // Redash snapshots (see latestCompleteWeekRange in sync-redash.ts) — a
  // single completed week, not the rolling 7-day window the rest of this
  // email uses, so it gets its own explicit label rather than implying a
  // "last 7 days" figure that isn't what's actually being summed.
  const weekLabel = `Week of ${formatDate(data.weekFromStr)} – ${formatDate(data.weekToStr)}`;

  return `
<div style="background:${PAGE_BG};padding:24px 12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:${CARD_BG};border-radius:14px;border:1px solid ${BORDER};padding:24px">
    <div style="font-size:18px;font-weight:700;color:${INK}">DotPe CRM — Sales Dashboard</div>
    <div style="font-size:12px;color:${MUTED};margin-top:2px">${data.fromStr} to ${data.toStr} (rolling 7 days)</div>

    ${sectionTitle("Sales Status")}
    ${kpiRow([
      kpiCell("Total Collected (INR)", formatInr(sales.totalCollectedInr, { compact: true }), BRAND),
      kpiCell("Total Collected (Branches)", formatNumber(sales.totalCollectedBranches), BRAND),
    ])}

    <div style="margin-top:14px">
      ${card(`
        <div style="font-size:12px;color:${MUTED};margin-bottom:10px">Pending vs Closed — INR</div>
        ${pendingClosedInrChart}
      `)}
    </div>

    <div style="margin-top:14px">
      ${card(`
        <div style="font-size:12px;color:${MUTED};margin-bottom:8px">Pending vs Closed — all figures</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:11px;color:${MUTED};text-transform:uppercase;padding-bottom:6px">&nbsp;</td>
            <td style="font-size:11px;color:${EMERALD};text-transform:uppercase;text-align:right;padding-bottom:6px">Closed</td>
            <td style="font-size:11px;color:${AMBER};text-transform:uppercase;text-align:right;padding-bottom:6px">Pending</td>
          </tr>
          ${pendingClosedRow("Merchants", formatNumber(potentialClosure.merchants.pending), formatNumber(potentialClosure.merchants.closed))}
          ${pendingClosedRow("Branches", formatNumber(potentialClosure.branches.pending), formatNumber(potentialClosure.branches.closed))}
          ${pendingClosedRow("INR", formatInr(potentialClosure.inr.pending, { compact: true }), formatInr(potentialClosure.inr.closed, { compact: true }))}
        </table>
      `)}
    </div>

    ${sectionTitle("Credit Consumption", weekLabel)}
    ${kpiRow([
      kpiCell("Total Credit Consumed", formatInr(credit.totalConsumed, { compact: true }), VIOLET),
      kpiCell("ARPU", formatInr(arpu.value, { compact: true }), VIOLET, "per branch/year"),
    ])}

    <div style="margin-top:14px">
      ${card(`
        <div style="font-size:12px;color:${MUTED};margin-bottom:10px">Credit consumed by category</div>
        ${creditByCategoryChart}
      `)}
    </div>

    ${sectionTitle("Adoption Summary", weekLabel)}
    ${kpiRow([
      kpiCell("Loyalty Setups", `${formatNumber(adoption.loyaltySetups)}`, EMERALD, `of ${formatNumber(adoption.loyaltyLicensedCount)} licensed`),
      kpiCell("Automation Setups", `${formatNumber(adoption.automationSetups)}`, EMERALD, `of ${formatNumber(adoption.crmActivatedCount)} CRM active`),
    ])}
    <div style="height:12px"></div>
    ${kpiRow([
      kpiCell("RFM Campaigns Sent", formatNumber(adoption.rfmCampaignsSent), EMERALD),
      kpiCell("Customers Reached", formatNumber(adoption.customersReached), EMERALD, "distinct, all channels"),
    ])}

    <div style="margin-top:28px;padding-top:16px;border-top:1px solid ${BORDER};text-align:center">
      <a href="${dashboardUrl}" style="display:inline-block;background:${BRAND};color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px">
        View full dashboard
      </a>
      <div style="font-size:11px;color:${MUTED};margin-top:10px">Full charts, trends, and merchant-level detail live here.</div>
    </div>
  </div>
</div>
  `;
}
