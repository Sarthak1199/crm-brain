import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Shared by the scheduled cron (api/cron/email-report, CRON_SECRET-gated)
// and the manual "Send now" trigger (api/admin/send-email-report,
// session-gated) — same screenshot-and-send pipeline either way, just a
// different caller and auth check.

function reportBaseUrl() {
  // VERCEL_PROJECT_PRODUCTION_URL is the stable custom/production domain
  // (unlike VERCEL_URL, which is per-deployment) — set automatically by
  // Vercel, no manual env var needed in the common case.
  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL || "crm-brain-two.vercel.app";
  return `https://${domain}`;
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

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return { ok: false, error: "CRON_SECRET not configured" };
  }
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  // The report page is gated by the same CRON_SECRET as a query token (see
  // src/app/report/dashboard/page.tsx) rather than a session cookie —
  // Puppeteer carries neither a login session nor any way to obtain one.
  const reportUrl = `${reportBaseUrl()}/report/dashboard?token=${encodeURIComponent(cronSecret)}`;

  let screenshot: Buffer;
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 900 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 90_000 });
    // Recharts finishes its own ResizeObserver-driven layout pass a beat
    // after the network goes idle — without this, charts can capture as
    // still-collapsing/zero-height (the same timing quirk observed testing
    // this page manually).
    await new Promise((resolve) => setTimeout(resolve, 1500));
    screenshot = (await page.screenshot({ fullPage: true, type: "png" })) as Buffer;
  } catch (error) {
    console.error("email-report: screenshot capture failed", error);
    return { ok: false, error: "Screenshot capture failed" };
  } finally {
    await browser.close();
  }

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
      html: `
        <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0B1220">
          <p>Sales dashboard snapshot — rolling last 7 days.</p>
          <img src="cid:dashboard-snapshot" alt="Dashboard snapshot" style="max-width:100%;border:1px solid #E5E9F0;border-radius:8px" />
        </div>
      `,
      attachments: [
        {
          filename: "dashboard.png",
          content: screenshot.toString("base64"),
          contentId: "dashboard-snapshot",
        },
      ],
    });
  } catch (error) {
    console.error("email-report: send failed", error);
    return { ok: false, error: "Send failed" };
  }

  return { ok: true, recipients: recipients.length };
}
