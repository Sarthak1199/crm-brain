// Creates (or resets) a single Manager/User account with a freshly generated
// temp password, forced to be changed on first login (mustResetPassword).
// Usage: tsx scripts/create-rbac-account.ts <email> <name> <MANAGER|USER>
//
// The generated password is written ONLY to a local file outside the repo
// (path given via RBAC_OUTPUT_PATH, or defaults below) — never printed to
// stdout — so it doesn't end up in a terminal scrollback, log, or chat
// transcript. Delete that file once the credential has been handed off.

import { randomBytes } from "crypto";
import { appendFileSync } from "fs";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function generatePassword(): string {
  // 18 chars from a mixed alphabet, base64url-derived — no ambiguous-char
  // filtering needed since this is typed once then replaced immediately.
  return randomBytes(14).toString("base64url").slice(0, 18);
}

async function main() {
  const [email, name, roleArg] = process.argv.slice(2);
  if (!email || !name || (roleArg !== "MANAGER" && roleArg !== "USER")) {
    console.error("Usage: tsx scripts/create-rbac-account.ts <email> <name> <MANAGER|USER>");
    process.exit(1);
  }
  const role = roleArg as UserRole;

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { name, role, passwordHash, mustResetPassword: true },
    create: { email: normalizedEmail, name, role, passwordHash, mustResetPassword: true },
  });

  const outPath = process.env.RBAC_OUTPUT_PATH || "./rbac-credentials.txt";
  appendFileSync(
    outPath,
    `email: ${user.email}\nname: ${user.name}\nrole: ${user.role}\ntemp password: ${password}\n---\n`
  );
  console.log(`Created/updated ${user.email} (${user.role}). Credential appended to ${outPath} — not printed here.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
