"use server";

import { revalidatePath } from "next/cache";
import { TemplateChannel, TemplateDealType, TemplateCategory, TemplateHandle, TemplateApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMutate } from "@/lib/require-mutate";

function parseTemplateFields(formData: FormData) {
  const name = formData.get("name");
  const channel = formData.get("channel");
  const dealType = formData.get("dealType");
  const messageText = formData.get("messageText");
  const category = formData.get("category");
  const handle = formData.get("handle");
  const requestedMid = formData.get("requestedMid");
  const eventId = formData.get("eventId");

  if (channel !== "SMS" && channel !== "WhatsApp") {
    return { error: "Select a channel." } as const;
  }
  if (dealType !== "WithDeal" && dealType !== "WithoutDeal") {
    return { error: "Select a template type." } as const;
  }
  if (typeof messageText !== "string" || !messageText.trim()) {
    return { error: "Message text is required." } as const;
  }
  if (category !== "Loyalty" && category !== "Automation" && category !== "Campaign" && category !== "Utility") {
    return { error: "Select a category." } as const;
  }
  if (handle !== "Merchant" && handle !== "RistaByDotpe" && handle !== "DotpeCRM") {
    return { error: "Select a handle." } as const;
  }

  return {
    data: {
      name: typeof name === "string" && name.trim() ? name.trim() : null,
      channel: channel as TemplateChannel,
      dealType: dealType as TemplateDealType,
      messageText: messageText.trim(),
      category: category as TemplateCategory,
      handle: handle as TemplateHandle,
      requestedMid: typeof requestedMid === "string" && requestedMid.trim() ? requestedMid.trim() : null,
      eventId: typeof eventId === "string" && eventId.trim() ? eventId.trim() : null,
    },
  } as const;
}

export async function createTemplate(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  await requireMutate();
  const parsed = parseTemplateFields(formData);
  if ("error" in parsed) return parsed.error;

  await prisma.template.create({ data: parsed.data });
  revalidatePath("/templates");
  return undefined;
}

export async function updateTemplate(
  templateId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireMutate();
  const parsed = parseTemplateFields(formData);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.template.findUnique({ where: { id: templateId } });
  if (!existing) return "Template not found.";

  await prisma.template.update({ where: { id: templateId }, data: parsed.data });
  revalidatePath("/templates");
  return undefined;
}

// Quick toggle from the list view. Enforced in a transaction rather than a
// DB constraint (Prisma's schema DSL can't express a partial/conditional
// unique index without dropping to raw SQL in the migration, and this
// admin tool's write volume doesn't need that): turning a template's
// isDefault on first clears it from every other template sharing the same
// eventId, so at most one stays true per event.
export async function setTemplateDefault(templateId: string, isDefault: boolean): Promise<string | undefined> {
  await requireMutate();

  const template = await prisma.template.findUnique({ where: { id: templateId }, select: { eventId: true } });
  if (!template) return "Template not found.";

  if (isDefault && template.eventId) {
    await prisma.$transaction([
      prisma.template.updateMany({
        where: { eventId: template.eventId, id: { not: templateId } },
        data: { isDefault: false },
      }),
      prisma.template.update({ where: { id: templateId }, data: { isDefault: true } }),
    ]);
  } else {
    await prisma.template.update({ where: { id: templateId }, data: { isDefault } });
  }

  revalidatePath("/templates");
  return undefined;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await requireMutate();
  await prisma.template.delete({ where: { id: templateId } });
  revalidatePath("/templates");
}

export async function addTemplateApproval(
  templateId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireMutate();
  const approvalStatus = formData.get("approvalStatus");
  const eventId = formData.get("eventId");
  const providerTemplateId = formData.get("providerTemplateId");

  if (approvalStatus !== "Submitted" && approvalStatus !== "Approved") {
    return "Select an approval status.";
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) return "Template not found.";

  await prisma.templateApproval.create({
    data: {
      templateId,
      approvalStatus: approvalStatus as TemplateApprovalStatus,
      eventId: typeof eventId === "string" && eventId.trim() ? eventId.trim() : null,
      providerTemplateId: typeof providerTemplateId === "string" && providerTemplateId.trim() ? providerTemplateId.trim() : null,
    },
  });

  revalidatePath("/templates");
  return undefined;
}

export async function updateTemplateApproval(
  approvalId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireMutate();
  const approvalStatus = formData.get("approvalStatus");
  const eventId = formData.get("eventId");
  const providerTemplateId = formData.get("providerTemplateId");

  if (approvalStatus !== "Submitted" && approvalStatus !== "Approved") {
    return "Select an approval status.";
  }

  const existing = await prisma.templateApproval.findUnique({ where: { id: approvalId } });
  if (!existing) return "Approval record not found.";

  await prisma.templateApproval.update({
    where: { id: approvalId },
    data: {
      approvalStatus: approvalStatus as TemplateApprovalStatus,
      eventId: typeof eventId === "string" && eventId.trim() ? eventId.trim() : null,
      providerTemplateId: typeof providerTemplateId === "string" && providerTemplateId.trim() ? providerTemplateId.trim() : null,
    },
  });

  revalidatePath("/templates");
  return undefined;
}

export async function deleteTemplateApproval(approvalId: string): Promise<void> {
  await requireMutate();
  await prisma.templateApproval.delete({ where: { id: approvalId } });
  revalidatePath("/templates");
}
