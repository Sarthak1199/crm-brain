"use server";

import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMutate, requireAuthenticated } from "@/lib/require-mutate";

const MAX_FILES = 6;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB per file
// Sized to leave headroom under next.config.ts's 10MB Server Action body
// limit (multipart boundaries/headers and the form's other fields also
// count against that budget) — see the note there on Vercel's own,
// lower platform-level request-body ceiling for genuinely large files.
const MAX_TOTAL_SIZE = 9 * 1024 * 1024;

type SharedFields = {
  merchantId: string | null;
  merchantNameFreeText: string | null;
  type: "Bug" | "Feature";
  totalBranches: number;
  totalPotential: number;
  productRemarks: string | null;
};

// One merchant, one shared branches/potential/remarks — but each free-text
// description in the repeatable list is its own individual ask, so it
// becomes its own SupportRequest row (and its own count on the KPI card).
//
// Merchant is either an existing one (merchantId set by the combobox) or a
// typed name for a merchant not yet in the Merchant table (merchantName) —
// exactly one of the two is expected, not both.
function parseMultiDescriptionFields(formData: FormData) {
  const merchantId = formData.get("merchantId");
  const merchantName = formData.get("merchantName");
  const type = formData.get("type");
  const totalBranchesRaw = formData.get("totalBranches");
  const totalPotentialRaw = formData.get("totalPotential");
  const productRemarks = formData.get("productRemarks");

  const hasMerchantId = typeof merchantId === "string" && merchantId.trim().length > 0;
  const hasMerchantName = typeof merchantName === "string" && merchantName.trim().length > 0;
  if (!hasMerchantId && !hasMerchantName) {
    return { error: "Select or enter a merchant name." } as const;
  }

  if (type !== "Bug" && type !== "Feature") {
    return { error: "Select a request type." } as const;
  }

  const totalBranches = Number(totalBranchesRaw);
  const totalPotential = Number(totalPotentialRaw);
  if (!Number.isFinite(totalBranches) || totalBranches < 0) {
    return { error: "Total Loyalty Branches must be a non-negative number." } as const;
  }
  if (!Number.isFinite(totalPotential) || totalPotential < 0) {
    return { error: "Total potential must be a non-negative number." } as const;
  }

  const descriptions = formData
    .getAll("description")
    .filter((d): d is string => typeof d === "string" && !!d.trim())
    .map((d) => d.trim());
  if (descriptions.length === 0) {
    return { error: "Add at least one description." } as const;
  }

  // The one intentionally optional field — no validation needed either way.
  const productRemarksTrimmed =
    typeof productRemarks === "string" && productRemarks.trim() ? productRemarks.trim() : null;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Attach at least one file." } as const;
  }
  if (files.length > MAX_FILES) {
    return { error: `Attach at most ${MAX_FILES} files.` } as const;
  }
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return { error: `Attachments are too large (max ${Math.floor(MAX_TOTAL_SIZE / (1024 * 1024))}MB total).` } as const;
  }
  const oversizeFile = files.find((f) => f.size > MAX_FILE_SIZE);
  if (oversizeFile) {
    return { error: `"${oversizeFile.name}" is too large (max ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB per file).` } as const;
  }

  const shared: SharedFields = {
    merchantId: hasMerchantId ? (merchantId as string).trim() : null,
    merchantNameFreeText: hasMerchantId ? null : (merchantName as string).trim(),
    type,
    totalBranches: Math.round(totalBranches),
    totalPotential,
    productRemarks: productRemarksTrimmed,
  };

  return { data: { shared, descriptions } } as const;
}

// The client's `accept` attribute and the uploaded File's own .name/.type
// are both attacker-controlled hints, not proof — a request built by hand
// could upload anything. Sniff the actual file signature and derive the
// saved extension from that, so a renamed file (e.g. .html, which the
// browser would execute if ever opened directly from /uploads) can't reach
// disk with a trusted-looking extension. CSV has no reliable magic bytes —
// it's plain text — so it's the one type allowed through on extension
// alone, guarded by a check that the content doesn't look like markup.
const FILE_SIGNATURES: { ext: string; matches: (b: Buffer) => boolean }[] = [
  { ext: ".jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: ".png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a,
  },
  { ext: ".gif", matches: (b) => b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a" },
  {
    ext: ".webp",
    matches: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
  { ext: ".pdf", matches: (b) => b.toString("ascii", 0, 4) === "%PDF" },
  // ISO base media (mp4, mov, m4v, ...): "ftyp" box starting at byte 4.
  { ext: ".mp4", matches: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  // Modern .xlsx is a zip container — PK local-file-header signature.
  { ext: ".xlsx", matches: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 },
  // Legacy .xls (OLE compound file).
  {
    ext: ".xls",
    matches: (b) =>
      b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 && b[4] === 0xa1 && b[5] === 0xb1,
  },
];

function detectFileExtension(buffer: Buffer, originalName: string): string | null {
  const bySignature = FILE_SIGNATURES.find((sig) => sig.matches(buffer))?.ext;
  if (bySignature) return bySignature;

  // CSV: plain text, no magic bytes to sniff. Trust the extension only,
  // and only if the content doesn't start with something that looks like
  // markup (a renamed .html wouldn't pass this).
  if (originalName.toLowerCase().endsWith(".csv")) {
    const head = buffer.toString("utf8", 0, Math.min(buffer.length, 512)).trimStart();
    if (!head.startsWith("<")) return ".csv";
  }

  return null;
}

async function saveFiles(requestId: string, formData: FormData): Promise<string[]> {
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return [];

  const dir = path.join(process.cwd(), "public", "uploads", "requests", requestId);
  await mkdir(dir, { recursive: true });

  const paths: string[] = [];
  for (const file of files.slice(0, MAX_FILES)) {
    if (file.size > MAX_FILE_SIZE) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = detectFileExtension(buffer, file.name);
    if (!ext) continue; // not a recognized type by content — skip silently
    const safeName = `${randomUUID()}${ext}`;
    await writeFile(path.join(dir, safeName), buffer);
    paths.push(`/uploads/requests/${requestId}/${safeName}`);
  }
  return paths;
}

export async function createSupportRequest(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAuthenticated();
  const parsed = parseMultiDescriptionFields(formData);
  if ("error" in parsed) return parsed.error;
  const { shared, descriptions } = parsed.data;

  if (shared.merchantId) {
    const merchant = await prisma.merchant.findUnique({ where: { id: shared.merchantId } });
    if (!merchant) return "Merchant not found.";
  }

  for (const description of descriptions) {
    const created = await prisma.supportRequest.create({
      data: { ...shared, description },
    });

    const newFiles = await saveFiles(created.id, formData);
    if (newFiles.length === 0) {
      // Every file failed content sniffing (or was silently dropped for
      // size) — the request is still created (its own description is real
      // and shouldn't be lost), but a request with 0 saved files despite
      // the field being required would be a confusing dead end otherwise.
      await prisma.supportRequest.delete({ where: { id: created.id } });
      return "None of the attached files could be saved — check the file type and try again.";
    }
    await prisma.supportRequest.update({ where: { id: created.id }, data: { images: newFiles } });
  }

  revalidatePath("/requests");
  return undefined;
}

export async function deleteSupportRequest(requestId: string): Promise<void> {
  await requireMutate();
  const dir = path.join(process.cwd(), "public", "uploads", "requests", requestId);
  await prisma.supportRequest.delete({ where: { id: requestId } });
  await rm(dir, { recursive: true, force: true });
  revalidatePath("/requests");
}
