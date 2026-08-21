"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function resetPassword(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return "Not signed in.";

  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirmPassword) {
    return "Passwords don't match.";
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustResetPassword: false },
  });

  // The JWT still carries the old mustResetPassword: true claim until it's
  // reissued — signing out (rather than trying to patch the live session)
  // forces a fresh login, which mints a token off the just-updated DB row.
  await signOut({ redirectTo: "/login" });
}
