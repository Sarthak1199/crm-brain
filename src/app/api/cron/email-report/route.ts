import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// puppeteer-core + @sparticuz/chromium need a real Node process (not the
// Edge runtime) and a screenshot round-trip is slow (cold-start chromium +
// page render), hence the generous maxDuration relative to the other cron
// routes in this app.
export const runtime = "nodejs";
export const maxDuration = 180;

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never authorize against an unset secret
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function reportBaseUrl() {
  // VERCEL_PROJECT_PRODUCTION_URL is the stable custom/production domain
  // (unlike VERCEL_URL, which is per-deployment) — set automatically by
  // Vercel, no manual env var needed in the common case.
  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL || "crm-brain-two.vercel.app";
  return `https://${domain}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipients = await prisma.emailAlertRecipient.findMany({ select: { email: true } });
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no recipients configured" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

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
    return NextResponse.json({ ok: false, error: "Screenshot capture failed" }, { status: 500 });
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
    // NOTE: verify the attachment field name (contentId here) against the
    // installed Resend SDK version once a real API key is in place — this
    // is the one part of the pipeline that couldn't be tested end-to-end
    // without a Resend account. If inline embedding via cid: doesn't
    // render, the screenshot still arrives as a regular attachment.
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
    return NextResponse.json({ ok: false, error: "Send failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recipients: recipients.length });
}
