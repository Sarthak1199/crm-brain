import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Temporary, single-use route to create the RBAC Manager/Admin accounts
// directly against production — deploy this, call it once, then delete the
// file. Not gated on CRON_SECRET or session auth: it exists for exactly one
// manual invocation, authorized by a token generated fresh for this
// purpose. Returns the generated temp passwords in the response body (to
// the caller only, over HTTPS) — never logged, never rendered in any UI.
export const maxDuration = 30;

const ONE_TIME_TOKEN = "84d070ceec238cfbb8051938ddcbc4e18e3035f875c4472a";

function generatePassword(): string {
  return randomBytes(14).toString("base64url").slice(0, 18);
}

const ACCOUNTS: { email: string; name: string; role: UserRole }[] = [
  { email: "crm_admin@dotpe.in", name: "CRM Admin", role: "ADMIN" },
  { email: "crm_manager@dotpe.in", name: "CRM Manager", role: "MANAGER" },
  { email: "crm_user@dotpe.in", name: "CRM User", role: "USER" },
];

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];
  for (const account of ACCOUNTS) {
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, role: account.role, passwordHash, mustResetPassword: true },
      create: { email: account.email, name: account.name, role: account.role, passwordHash, mustResetPassword: true },
    });
    results.push({ email: user.email, name: user.name, role: user.role, tempPassword: password });
  }

  return NextResponse.json({ ok: true, accounts: results });
}
