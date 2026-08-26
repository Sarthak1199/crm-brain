import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
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
