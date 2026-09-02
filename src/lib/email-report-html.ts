import { formatInr, formatNumber } from "@/lib/format";
import type { EmailReportData } from "@/lib/report-data";

// Table-based layout with inline styles throughout — email clients (Gmail,
// Outlook desktop especially) strip <style> blocks and don't reliably
// support flexbox/grid, so this deliberately doesn't reuse any of the
// dashboard's own Tailwind-based components. Plain numbers, not charts —
// bar/line/pie charts aren't practical to render as email-safe HTML; the
// footer links back to the live dashboard for those.
//
// Replaces an earlier full-page screenshot attached as an inline image:
// Gmail clips any message over ~102KB (including inline images) behind a
// "message clipped"/"..." control instead of showing it inline, which is
// exactly what a full-dashboard screenshot ran into.

const BRAND = "#1188EF";
const INK = "#0B1220";
const MUTED = "#64748B";
const BORDER = "#E5E9F0";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F8FAFC";

function kpiCell(label: string, value: string, sub?: string) {
  return `
    <td style="padding:6px" valign="top">
      <div style="border:1px solid ${BORDER};border-radius:10px;padding:14px;background:${CARD_BG}">
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
      <td style="padding:8px 0;font-size:13px;color:${INK};text-align:right;border-bottom:1px solid ${BORDER}">${closed}</td>
      <td style="padding:8px 0;font-size:13px;color:${INK};text-align:right;border-bottom:1px solid ${BORDER}">${pending}</td>
    </tr>
  `;
}

function sectionTitle(title: string) {
  return `<div style="font-size:15px;font-weight:700;color:${INK};margin:28px 0 12px">${title}</div>`;
}

export function buildReportHtml(data: EmailReportData, dashboardUrl: string): string {
  const { sales, potentialClosure, credit, arpu } = data;

  return `
<div style="background:${PAGE_BG};padding:24px 12px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:${CARD_BG};border-radius:14px;border:1px solid ${BORDER};padding:24px">
    <div style="font-size:18px;font-weight:700;color:${INK}">DotPe CRM — Sales Dashboard</div>
    <div style="font-size:12px;color:${MUTED};margin-top:2px">${data.fromStr} to ${data.toStr} (rolling 7 days)</div>

    ${sectionTitle("Sales Status")}
    ${kpiRow([
      kpiCell("Total Collected (INR)", formatInr(sales.totalCollectedInr, { compact: true })),
      kpiCell("Total Collected (Branches)", formatNumber(sales.totalCollectedBranches)),
    ])}

    <div style="margin-top:14px;border:1px solid ${BORDER};border-radius:10px;padding:14px">
      <div style="font-size:12px;color:${MUTED};margin-bottom:8px">Pending vs Closed</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:11px;color:${MUTED};text-transform:uppercase;padding-bottom:6px">&nbsp;</td>
          <td style="font-size:11px;color:${MUTED};text-transform:uppercase;text-align:right;padding-bottom:6px">Closed</td>
          <td style="font-size:11px;color:${MUTED};text-transform:uppercase;text-align:right;padding-bottom:6px">Pending</td>
        </tr>
        ${pendingClosedRow("Merchants", formatNumber(potentialClosure.merchants.pending), formatNumber(potentialClosure.merchants.closed))}
        ${pendingClosedRow("Branches", formatNumber(potentialClosure.branches.pending), formatNumber(potentialClosure.branches.closed))}
        ${pendingClosedRow("INR", formatInr(potentialClosure.inr.pending, { compact: true }), formatInr(potentialClosure.inr.closed, { compact: true }))}
      </table>
    </div>

    ${sectionTitle("Credit Consumption")}
    ${kpiRow([
      kpiCell("Total Credit Consumed", formatInr(credit.totalConsumed, { compact: true })),
      kpiCell("Total Automation Credits", formatInr(credit.automation, { compact: true })),
    ])}
    <div style="height:12px"></div>
    ${kpiRow([
      kpiCell("Total Campaign Credits", formatInr(credit.campaigns, { compact: true })),
      kpiCell("Total Loyalty Credits", formatInr(credit.loyalty, { compact: true })),
    ])}
    <div style="height:12px"></div>
    ${kpiRow([kpiCell("ARPU", formatInr(arpu.value, { compact: true }), "per branch/year")])}

    <div style="margin-top:28px;padding-top:16px;border-top:1px solid ${BORDER};text-align:center">
      <a href="${dashboardUrl}" style="display:inline-block;background:${BRAND};color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px">
        View full dashboard
      </a>
      <div style="font-size:11px;color:${MUTED};margin-top:10px">Charts, drill-downs, and merchant-level detail live here.</div>
    </div>
  </div>
</div>
  `;
}
