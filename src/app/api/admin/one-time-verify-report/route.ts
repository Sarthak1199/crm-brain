import { NextResponse } from "next/server";
import { getEmailReportData } from "@/lib/report-data";

const TOKEN = "81df5eeaf73927298c189668911552072cf5e5cc8c30612e";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await getEmailReportData();
  return NextResponse.json(data);
}
