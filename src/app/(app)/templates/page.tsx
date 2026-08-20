import type { Prisma } from "@prisma/client";
import { MessageSquareText, CheckCircle2, LayoutList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatNumber } from "@/lib/format";
import { TemplateForm } from "./template-form";
import { TemplatesFilter } from "./templates-filter";
import { TemplatesTable } from "./templates-table";
import type { TemplateRow } from "./templates-table";

type SearchParams = { channel?: string; category?: string; handle?: string };

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const where: Prisma.TemplateWhereInput = {};
  if (params.channel === "SMS" || params.channel === "WhatsApp") {
    where.channel = params.channel;
  }
  if (params.category === "none") {
    where.category = null;
  } else if (
    params.category === "Loyalty" ||
    params.category === "Automation" ||
    params.category === "Campaign" ||
    params.category === "Utility"
  ) {
    where.category = params.category;
  }
  if (params.handle === "Merchant" || params.handle === "RistaByDotpe" || params.handle === "DotpeCRM") {
    where.handle = params.handle;
  }

  const templates = await prisma.template.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      approvals: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const rows: TemplateRow[] = templates.map((t) => ({
    id: t.id,
    channel: t.channel,
    dealType: t.dealType,
    category: t.category,
    handle: t.handle,
    messageText: t.messageText,
    createdAt: t.createdAt.toISOString(),
    approvals: t.approvals,
  }));

  const approvedCount = rows.filter((r) => r.approvals.some((a) => a.approvalStatus === "Approved")).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Message Templates"
          description="SMS and WhatsApp templates, with approval submissions once live on the provider."
        />
        <TemplateForm />
      </div>

      <div className="mb-5">
        <TemplatesFilter />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={MessageSquareText} label="Templates" value={formatNumber(rows.length)} />
        <StatCard icon={CheckCircle2} label="Approved" value={formatNumber(approvedCount)} />
        <StatCard
          icon={LayoutList}
          label="Uncategorized"
          value={formatNumber(rows.filter((r) => !r.category).length)}
        />
      </div>

      <TemplatesTable rows={rows} />
    </div>
  );
}
