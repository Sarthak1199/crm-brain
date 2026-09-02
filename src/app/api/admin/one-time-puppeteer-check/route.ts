import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs";
export const maxDuration = 180;

const TOKEN = "ac6c3f627c34ca44c17c0f176ee0de6ed8da5e2677007254";

// Verifies puppeteer-core + @sparticuz/chromium actually launch and can
// screenshot the token-gated report page on Vercel's real Linux serverless
// runtime — this can't be tested locally on macOS (the bundled chromium
// binary is Linux-only). Does not touch Resend or send anything.
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL || "crm-brain-two.vercel.app";
  const reportUrl = `https://${domain}/report/dashboard?token=${encodeURIComponent(cronSecret)}`;

  const start = Date.now();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 900 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 90_000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const screenshot = await page.screenshot({ fullPage: true, type: "png" });
    return NextResponse.json({
      ok: true,
      screenshotBytes: screenshot.length,
      elapsedMs: Date.now() - start,
      reportUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await browser.close();
  }
}
