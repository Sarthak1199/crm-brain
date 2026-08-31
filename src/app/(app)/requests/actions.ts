"use server";

import { put, del } from "@vercel/blob";
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

function parseSharedFields(formData: FormData): { error: string } | { data: SharedFields } {
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
  if (!Number.isFinite(totalBranches) || totalBranches < 0) {
    return { error: "Total Loyalty Branches must be a non-negative number." } as const;
  }
  // Manual, not sheet-derived: the closures sheet's pending-potential figure
  // only exists for merchants that already have a closure entry there, so it
  // reads as 0 for anything not yet closed — useless for most open asks.
  const totalPotential = Number(totalPotentialRaw);
  if (!Number.isFinite(totalPotential) || totalPotential < 0) {
    return { error: "Pending potential must be a non-negative number." } as const;
  }

  // The one intentionally optional field — no validation needed either way.
  const productRemarksTrimmed =
    typeof productRemarks === "string" && productRemarks.trim() ? productRemarks.trim() : null;

  const shared: SharedFields = {
    merchantId: hasMerchantId ? (merchantId as string).trim() : null,
    merchantNameFreeText: hasMerchantId ? null : (merchantName as string).trim(),
    type,
    totalBranches: Math.round(totalBranches),
    totalPotential,
    productRemarks: productRemarksTrimmed,
  };

  return { data: shared } as const;
}

function parseFiles(formData: FormData): { error: string } | { data: File[] } {
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
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
  return { data: files } as const;
}

// One merchant, one shared branches/potential/remarks — but each free-text
// description in the repeatable list is its own individual ask, so it
// becomes its own SupportRequest row (and its own count on the KPI card).
// Used for both create (every description is a new row) and edit (the
// first description updates the row being edited; any more become new
// rows against the same merchant — see updateSupportRequest).
//
// Merchant is either an existing one (merchantId set by the combobox) or a
// typed name for a merchant not yet in the Merchant table (merchantName) —
// exactly one of the two is expected, not both.
function parseDescriptionFields(formData: FormData) {
  const shared = parseSharedFields(formData);
  if ("error" in shared) return shared;

  const descriptions = formData
    .getAll("description")
    .filter((d): d is string => typeof d === "string" && !!d.trim())
    .map((d) => d.trim());
  if (descriptions.length === 0) {
    return { error: "Add at least one description." } as const;
  }

  const files = parseFiles(formData);
  if ("error" in files) return files;

  return { data: { shared: shared.data, descriptions, files: files.data } } as const;
}

// The client's `accept` attribute and the uploaded File's own .name/.type
// are both attacker-controlled hints, not proof — a request built by hand
// could upload anything. Sniff the actual file signature and derive the
// saved extension from that, so a renamed file (e.g. .html, which the
// browser would execute if ever opened directly) can't reach storage with
// a trusted-looking extension. CSV has no reliable magic bytes — it's
// plain text — so it's the one type allowed through on extension alone,
// guarded by a check that the content doesn't look like markup.
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

// Vercel's serverless filesystem is ephemeral and `public/` is served from
// an immutable build-time snapshot — files written there at runtime via
// fs.writeFile are never actually reachable, which is why uploaded media
// was invisible. Vercel Blob gives each file a real, persistent, publicly
// fetchable URL instead.
async function saveFiles(requestId: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files.slice(0, MAX_FILES)) {
    if (file.size > MAX_FILE_SIZE) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = detectFileExtension(buffer, file.name);
    if (!ext) continue; // not a recognized type by content — skip silently
    const blob = await put(`requests/${requestId}/${crypto.randomUUID()}${ext}`, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    paths.push(blob.url);
  }
  return paths;
}

export async function createSupportRequest(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAuthenticated();
  const parsed = parseDescriptionFields(formData);
  if ("error" in parsed) return parsed.error;
  const { shared, descriptions, files } = parsed.data;

  if (shared.merchantId) {
    const merchant = await prisma.merchant.findUnique({ where: { id: shared.merchantId } });
    if (!merchant) return "Merchant not found.";
  }

  for (const description of descriptions) {
    const created = await prisma.supportRequest.create({
      data: { ...shared, description },
    });

    if (files.length > 0) {
      const savedFiles = await saveFiles(created.id, files);
      if (savedFiles.length > 0) {
        await prisma.supportRequest.update({ where: { id: created.id }, data: { images: savedFiles } });
      }
    }
  }

  revalidatePath("/requests");
  return undefined;
}

// Edit reuses the same repeatable-descriptions field as create: the first
// description updates the row being edited (matching prior behavior), and
// any additional ones become brand-new SupportRequest rows against the same
// merchant/branches/potential/remarks — letting the filer log more asks
// for an already-known merchant without leaving the edit dialog. Newly
// uploaded files are duplicated onto every new row, same as create; the
// row being edited instead appends them to its own existing images.
export async function updateSupportRequest(
  requestId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireMutate();
  const parsed = parseDescriptionFields(formData);
  if ("error" in parsed) return parsed.error;
  const { shared, descriptions, files } = parsed.data;
  const [primaryDescription, ...extraDescriptions] = descriptions;

  const existing = await prisma.supportRequest.findUnique({ where: { id: requestId } });
  if (!existing) return "Request not found.";

  if (shared.merchantId) {
    const merchant = await prisma.merchant.findUnique({ where: { id: shared.merchantId } });
    if (!merchant) return "Merchant not found.";
  }

  const newFiles = files.length > 0 ? await saveFiles(requestId, files) : [];
  const existingImages = Array.isArray(existing.images) ? (existing.images as string[]) : [];

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      ...shared,
      description: primaryDescription,
      ...(newFiles.length > 0 ? { images: [...existingImages, ...newFiles] } : {}),
    },
  });

  for (const description of extraDescriptions) {
    const created = await prisma.supportRequest.create({
      data: { ...shared, description },
    });
    if (newFiles.length > 0) {
      await prisma.supportRequest.update({ where: { id: created.id }, data: { images: newFiles } });
    }
  }

  revalidatePath("/requests");
  return undefined;
}

export async function deleteSupportRequest(requestId: string): Promise<void> {
  await requireMutate();
  const existing = await prisma.supportRequest.findUnique({ where: { id: requestId }, select: { images: true } });
  await prisma.supportRequest.delete({ where: { id: requestId } });

  const images = Array.isArray(existing?.images) ? (existing.images as string[]) : [];
  if (images.length > 0) {
    try {
      await del(images);
    } catch (error) {
      console.error(`deleteSupportRequest: failed to delete blobs for ${requestId}`, error);
    }
  }

  revalidatePath("/requests");
}
