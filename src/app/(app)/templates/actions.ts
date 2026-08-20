"use server";

import { revalidatePath } from "next/cache";
import { Prisma, TemplateChannel, TemplateDealType, TemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function parseTemplateFields(formData: FormData) {
  const channel = formData.get("channel");
  const dealType = formData.get("dealType");
  const messageText = formData.get("messageText");
  const category = formData.get("category");

  if (channel !== "SMS" && channel !== "WhatsApp") {
    return { error: "Select a channel." } as const;
  }
  if (dealType !== "WithDeal" && dealType !== "WithoutDeal") {
    return { error: "Select a template type." } as const;
  }
  if (typeof messageText !== "string" || !messageText.trim()) {
    return { error: "Message text is required." } as const;
  }
  if (
    category !== "Loyalty" &&
    category !== "Automation" &&
    category !== "Campaign" &&
    category !== "OTP" &&
    category !== "Utility"
  ) {
    return { error: "Select a category." } as const;
  }

  return {
    data: {
      channel: channel as TemplateChannel,
      dealType: dealType as TemplateDealType,
      messageText: messageText.trim(),
      category: category as TemplateCategory,
    },
  } as const;
}

export async function createTemplate(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
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
  const parsed = parseTemplateFields(formData);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.template.findUnique({ where: { id: templateId } });
  if (!existing) return "Template not found.";

  await prisma.template.update({ where: { id: templateId }, data: parsed.data });
  revalidatePath("/templates");
  return undefined;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await prisma.template.delete({ where: { id: templateId } });
  revalidatePath("/templates");
}

export async function addTemplateApproval(
  templateId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const merchantId = formData.get("merchantId");
  const providerTemplateId = formData.get("providerTemplateId");

  if (typeof merchantId !== "string" || !merchantId) {
    return "Select a merchant.";
  }
  if (typeof providerTemplateId !== "string" || !providerTemplateId.trim()) {
    return "Provider template ID is required.";
  }

  const [template, merchant] = await Promise.all([
    prisma.template.findUnique({ where: { id: templateId } }),
    prisma.merchant.findUnique({ where: { id: merchantId } }),
  ]);
  if (!template) return "Template not found.";
  if (!merchant) return "Merchant not found.";

  try {
    await prisma.templateApproval.create({
      data: { templateId, merchantId, providerTemplateId: providerTemplateId.trim() },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "This merchant already has an approval recorded for this template.";
    }
    throw error;
  }

  revalidatePath("/templates");
  return undefined;
}

export async function deleteTemplateApproval(approvalId: string): Promise<void> {
  await prisma.templateApproval.delete({ where: { id: approvalId } });
  revalidatePath("/templates");
}
