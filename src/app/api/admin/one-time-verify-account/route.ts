import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Temporary, single-use route: creates (POST) or deletes (DELETE) a
// throwaway Admin account used only to visually verify the P0 credit-fix
// and Customers Reached rework in the browser. Deploy, call once each way,
// then delete this file.
export const maxDuration = 30;

const ONE_TIME_TOKEN = "659084fa1c0e081c944391dc18232d18ca9e991a720ca890";
const VERIFY_EMAIL = "one-time-verify@dotpe.in";
const VERIFY_PASSWORD = "9c741a719ad9f0640a2adde74b781a1e";

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(VERIFY_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: VERIFY_EMAIL },
    create: { email: VERIFY_EMAIL, name: "One-Time Verify", passwordHash, role: "ADMIN" },
    update: { passwordHash, role: "ADMIN" },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${ONE_TIME_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.deleteMany({ where: { email: VERIFY_EMAIL } });
  return NextResponse.json({ ok: true });
}
