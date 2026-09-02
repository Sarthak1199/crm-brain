"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMutate } from "@/lib/require-mutate";
import { MAX_RECIPIENTS } from "./email-alerts-constants";

// Deliberately simple — this gates what goes into a DB column and an
// outbound email header, not full RFC 5322 validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addEmailAlertRecipient(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireMutate();
  const session = await auth();

  const raw = formData.get("email");
  if (typeof raw !== "string" || !raw.trim()) return "Enter an email address.";
  const email = raw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return "That doesn't look like a valid email address.";

  const count = await prisma.emailAlertRecipient.count();
  if (count >= MAX_RECIPIENTS) return `Recipient list is capped at ${MAX_RECIPIENTS}.`;

  try {
    await prisma.emailAlertRecipient.create({
      data: { email, createdBy: session?.user?.email ?? null },
    });
  } catch (error) {
    // Unique constraint — already on the list, not a real failure.
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return "That address is already on the list.";
    }
    console.error("addEmailAlertRecipient: failed to create", error);
    return "Could not add that address. Please try again.";
  }

  revalidatePath("/dashboard");
  return undefined;
}

export async function removeEmailAlertRecipient(id: string): Promise<void> {
  await requireMutate();
  await prisma.emailAlertRecipient.delete({ where: { id } }).catch((error) => {
    console.error(`removeEmailAlertRecipient: failed to delete ${id}`, error);
  });
  revalidatePath("/dashboard");
}
