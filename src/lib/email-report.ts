import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getEmailReportData } from "@/lib/report-data";
import { buildReportHtml } from "@/lib/email-report-html";

// Shared by the scheduled cron (api/cron/email-report, CRON_SECRET-gated)
// and the manual "Send now" trigger (api/admin/send-email-report,
// session-gated) — same build-and-send pipeline either way, just a
// different caller and auth check.
//
// Previously rendered the dashboard, screenshotted it with Puppeteer, and
// attached the PNG inline via cid: — dropped after a real report showed up
// in Gmail collapsed behind "..." (Gmail clips any message over ~102KB
// including inline images, and a full-page dashboard screenshot routinely
// exceeds that). This builds the email as plain HTML/text instead — no
// image, no headless-browser dependency, no way to be clipped.

function dashboardUrl() {
  // VERCEL_PROJECT_PRODUCTION_URL is the stable custom/production domain
  // (unlike VERCEL_URL, which is per-deployment) — set automatically by
  // Vercel, no manual env var needed in the common case.
  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL || "crm-brain-two.vercel.app";
  return `https://${domain}/dashboard`;
}

export type EmailReportResult =
  | { ok: true; skipped: string }
  | { ok: true; recipients: number }
  | { ok: false; error: string };

export async function sendDashboardEmailReport(): Promise<EmailReportResult> {
  const recipients = await prisma.emailAlertRecipient.findMany({ select: { email: true } });
  if (recipients.length === 0) {
    return { ok: true, skipped: "no recipients configured" };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const data = await getEmailReportData();
  const html = buildReportHtml(data, dashboardUrl());

  const resend = new Resend(resendApiKey);
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  try {
    await resend.emails.send({
      from: process.env.EMAIL_REPORT_FROM || "DotPe CRM Brain <onboarding@resend.dev>",
      to: recipients.map((r) => r.email),
      subject: `DotPe CRM — Sales Dashboard (${dateLabel})`,
      html,
    });
  } catch (error) {
    console.error("email-report: send failed", error);
    return { ok: false, error: "Send failed" };
  }

  return { ok: true, recipients: recipients.length };
}
