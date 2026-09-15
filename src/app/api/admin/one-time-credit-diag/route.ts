import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeMerchant } from "@/lib/serialize";
import { whitelistedMerchants } from "@/lib/dashboard-data";

const TOKEN = "66fa57666165aeb95af635d883daa8aca83db017a8d56744";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const merchants = await prisma.merchant.findMany();
  const mList = merchants.map(serializeMerchant);
  const rows = whitelistedMerchants(mList);

  return NextResponse.json({
    totalMerchants: merchants.length,
    whitelistedCount: rows.length,
    paidCount: rows.filter((r) => r.paid).length,
    pendingCount: rows.filter((r) => !r.paid).length,
    sample: rows.slice(0, 10),
  });
}
