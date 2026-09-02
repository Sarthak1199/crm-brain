import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // @sparticuz/chromium ships its own bin/ asset directory that puppeteer-
  // core reads by relative path at runtime — bundling it (the default for
  // server code) relocates those files out from under it, so it looks for
  // /var/task/node_modules/@sparticuz/chromium/bin and finds nothing.
  // Marking it external keeps node_modules layout intact instead.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
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
