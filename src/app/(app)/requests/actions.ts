"use server";

import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const MAX_FILES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function parseCommonFields(formData: FormData) {
  const merchantId = formData.get("merchantId");
  const type = formData.get("type");
  const description = formData.get("description");
  const totalBranchesRaw = formData.get("totalBranches");
  const totalPotentialRaw = formData.get("totalPotential");
  const productRemarks = formData.get("productRemarks");

  if (typeof merchantId !== "string" || !merchantId) {
    return { error: "Select a merchant." } as const;
  }
  if (type !== "Bug" && type !== "Feature") {
    return { error: "Select a request type." } as const;
  }
  if (typeof description !== "string" || !description.trim()) {
    return { error: "Description is required." } as const;
  }

  const totalBranches = Number(totalBranchesRaw);
  const totalPotential = Number(totalPotentialRaw);
  if (!Number.isFinite(totalBranches) || totalBranches < 0) {
    return { error: "Total branches must be a non-negative number." } as const;
  }
  if (!Number.isFinite(totalPotential) || totalPotential < 0) {
    return { error: "Total potential must be a non-negative number." } as const;
  }

  return {
    data: {
      merchantId,
      type,
      description: description.trim(),
      totalBranches: Math.round(totalBranches),
      totalPotential,
      productRemarks: typeof productRemarks === "string" && productRemarks.trim() ? productRemarks.trim() : null,
    },
  } as const;
}

type SharedFields = {
  merchantId: string;
  type: "Bug" | "Feature";
  totalBranches: number;
  totalPotential: number;
  productRemarks: string | null;
};

// One merchant, one shared branches/potential/remarks — but each free-text
// description in the repeatable list is its own individual ask, so it
// becomes its own SupportRequest row (and its own count on the KPI card).
function parseMultiDescriptionFields(formData: FormData) {
  const merchantId = formData.get("merchantId");
  const type = formData.get("type");
  const totalBranchesRaw = formData.get("totalBranches");
  const totalPotentialRaw = formData.get("totalPotential");
  const productRemarks = formData.get("productRemarks");

  if (typeof merchantId !== "string" || !merchantId) {
    return { error: "Select a merchant." } as const;
  }
  if (type !== "Bug" && type !== "Feature") {
    return { error: "Select a request type." } as const;
  }

  const totalBranches = Number(totalBranchesRaw);
  const totalPotential = Number(totalPotentialRaw);
  if (!Number.isFinite(totalBranches) || totalBranches < 0) {
    return { error: "Total branches must be a non-negative number." } as const;
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

  const shared: SharedFields = {
    merchantId,
    type,
    totalBranches: Math.round(totalBranches),
    totalPotential,
    productRemarks: typeof productRemarks === "string" && productRemarks.trim() ? productRemarks.trim() : null,
  };

  return { data: { shared, descriptions } } as const;
}

// The client's accept="image/*" and the uploaded File's own .name/.type are
// both attacker-controlled hints, not proof — a request built by hand could
// upload anything. Sniff the actual file signature and derive the saved
// extension from that, so a renamed non-image (e.g. .html, which the
// browser would execute if ever opened directly from /uploads) can't reach
// disk with a trusted-looking extension.
const IMAGE_SIGNATURES: { ext: string; matches: (b: Buffer) => boolean }[] = [
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
];

function detectImageExtension(buffer: Buffer): string | null {
  return IMAGE_SIGNATURES.find((sig) => sig.matches(buffer))?.ext ?? null;
}

async function saveImages(requestId: string, formData: FormData): Promise<string[]> {
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return [];

  const dir = path.join(process.cwd(), "public", "uploads", "requests", requestId);
  await mkdir(dir, { recursive: true });

  const imagePaths: string[] = [];
  for (const file of files.slice(0, MAX_FILES)) {
    if (file.size > MAX_FILE_SIZE) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = detectImageExtension(buffer);
    if (!ext) continue; // not a real image by content — skip silently
    const safeName = `${randomUUID()}${ext}`;
    await writeFile(path.join(dir, safeName), buffer);
    imagePaths.push(`/uploads/requests/${requestId}/${safeName}`);
  }
  return imagePaths;
}

export async function createSupportRequest(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const parsed = parseMultiDescriptionFields(formData);
  if ("error" in parsed) return parsed.error;
  const { shared, descriptions } = parsed.data;

  const merchant = await prisma.merchant.findUnique({ where: { id: shared.merchantId } });
  if (!merchant) return "Merchant not found.";

  for (const description of descriptions) {
    const created = await prisma.supportRequest.create({
      data: { ...shared, description },
    });

    const newImages = await saveImages(created.id, formData);
    if (newImages.length > 0) {
      await prisma.supportRequest.update({ where: { id: created.id }, data: { images: newImages } });
    }
  }

  revalidatePath("/requests");
  return undefined;
}

export async function updateSupportRequest(
  requestId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const parsed = parseCommonFields(formData);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.supportRequest.findUnique({ where: { id: requestId } });
  if (!existing) return "Request not found.";

  const newImages = await saveImages(requestId, formData);
  const existingImages = Array.isArray(existing.images) ? (existing.images as string[]) : [];

  await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      ...parsed.data,
      ...(newImages.length > 0 ? { images: [...existingImages, ...newImages] } : {}),
    },
  });

  revalidatePath("/requests");
  return undefined;
}

export async function deleteSupportRequest(requestId: string): Promise<void> {
  const dir = path.join(process.cwd(), "public", "uploads", "requests", requestId);
  await prisma.supportRequest.delete({ where: { id: requestId } });
  await rm(dir, { recursive: true, force: true });
  revalidatePath("/requests");
}
