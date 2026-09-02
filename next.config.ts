import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // @sparticuz/chromium ships its own bin/ asset directory that puppeteer-
  // core reads by relative path at runtime.
  // - serverExternalPackages keeps Next.js's own bundler from inlining it
  //   (which would relocate the files out from under the relative path).
  // - outputFileTracingIncludes is the separate fix needed on top of that:
  //   Vercel's deploy step only ships files it can statically trace as
  //   required by a route, and chromium.executablePath() computes its file
  //   path at runtime rather than a static import, so the tracer misses
  //   bin/ entirely without being told explicitly. Confirmed both are
  //   needed — serverExternalPackages alone still 500'd in production with
  //   "input directory .../bin does not exist".
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/cron/email-report": ["./node_modules/@sparticuz/chromium/**"],
    "/api/admin/send-email-report": ["./node_modules/@sparticuz/chromium/**"],
  },
  experimental: {
    // Server Actions default to a 1MB request body — too small for the
    // request form's file upload (PDF/CSV/XLS/images/video). Raised to fit
    // typical attachments; per-file/total caps are still enforced in
    // requests/actions.ts. Vercel's own serverless function request-body
    // ceiling (~4.5MB) sits below this, so large video files can still be
    // rejected at the platform level regardless of this setting — genuinely
    // reliable large-file/video upload would need direct-to-blob-storage
    // upload (e.g. Vercel Blob) rather than routing the bytes through a
    // Server Action's request body at all.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
