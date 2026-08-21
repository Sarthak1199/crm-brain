"use server";

import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMutate } from "@/lib/require-mutate";

export async function updateRoadmapStatus(id: string, status: string) {
  await requireMutate("roadmap");
  // The sheet's own status values aren't a closed set (the UI deliberately
  // lets an item's current, not-yet-catalogued value stay selectable), so
  // this isn't a strict allowlist — just a sanity bound against garbage.
  const trimmed = status.trim();
  if (!trimmed || trimmed.length > 100) return;

  await prisma.roadmapItem.update({ where: { id }, data: { status: trimmed } });
  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
}

// Same content-sniffing approach as the requests page's image upload: the
// client's accept="image/*" and the file's own .name/.type are attacker-
// controlled hints, not proof, so verify the actual bytes before saving and
// derive the extension from that rather than trusting the upload's name.
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
  { ext: ".pdf", matches: (b) => b.toString("ascii", 0, 5) === "%PDF-" },
];

function detectFileExtension(buffer: Buffer): string | null {
  return IMAGE_SIGNATURES.find((sig) => sig.matches(buffer))?.ext ?? null;
}

async function saveDesignAttachment(ticketId: string, formData: FormData): Promise<string | null> {
  const file = formData.get("designAttachment");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 5 * 1024 * 1024) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectFileExtension(buffer);
  if (!ext) return null; // not a recognized image/PDF by content — skip silently

  const dir = path.join(process.cwd(), "public", "uploads", "roadmap", ticketId);
  await mkdir(dir, { recursive: true });
  const safeName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, safeName), buffer);
  return `/uploads/roadmap/${ticketId}/${safeName}`;
}

function parseTicketFields(formData: FormData) {
  const title = formData.get("title");
  const ticketUrl = formData.get("ticketUrl");
  const design = formData.get("design");
  const status = formData.get("status");
  const description = formData.get("description");

  if (typeof title !== "string" || !title.trim()) {
    return { error: "Title is required." } as const;
  }
  if (typeof status !== "string" || !status.trim()) {
    return { error: "Status is required." } as const;
  }

  return {
    data: {
      title: title.trim(),
      ticketUrl: typeof ticketUrl === "string" && ticketUrl.trim() ? ticketUrl.trim() : null,
      design: typeof design === "string" && design.trim() ? design.trim() : null,
      status: status.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
    },
  } as const;
}

export async function createRoadmapTicket(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  await requireMutate("roadmap");
  const parsed = parseTicketFields(formData);
  if ("error" in parsed) return parsed.error;

  const created = await prisma.roadmapItem.create({ data: { ...parsed.data, isManual: true } });

  const attachmentPath = await saveDesignAttachment(created.id, formData);
  if (attachmentPath) {
    await prisma.roadmapItem.update({ where: { id: created.id }, data: { designAttachment: attachmentPath } });
  }

  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
  return undefined;
}

export async function updateRoadmapTicket(
  ticketId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireMutate("roadmap");
  const parsed = parseTicketFields(formData);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.roadmapItem.findUnique({ where: { id: ticketId } });
  if (!existing) return "Ticket not found.";

  const attachmentPath = await saveDesignAttachment(ticketId, formData);

  await prisma.roadmapItem.update({
    where: { id: ticketId },
    data: { ...parsed.data, ...(attachmentPath ? { designAttachment: attachmentPath } : {}) },
  });

  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
  return undefined;
}

export async function deleteRoadmapTicket(ticketId: string): Promise<void> {
  await requireMutate("roadmap");
  const dir = path.join(process.cwd(), "public", "uploads", "roadmap", ticketId);
  await prisma.roadmapItem.delete({ where: { id: ticketId } });
  await rm(dir, { recursive: true, force: true });
  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
}
