import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN = "60698e13712802cba0f35e4c0c2ee938d1de6a427ae126ec";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const recipient = await prisma.emailAlertRecipient.upsert({
    where: { email: "sarthak.gupta@dotpe.in" },
    create: { email: "sarthak.gupta@dotpe.in", createdBy: "one-time-route" },
    update: {},
  });

  return NextResponse.json({ ok: true, recipient });
}
