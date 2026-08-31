import type { Prisma } from "@prisma/client";
import { Bug, Building2, IndianRupee, Lightbulb } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canMutate } from "@/lib/authz";
import { serializeSupportRequest } from "@/lib/serialize";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatInr, formatNumber } from "@/lib/format";
import { RequestForm } from "./request-form";
import { RequestsFilter } from "./requests-filter";
import { RequestsTable } from "./requests-table";

type SearchParams = { type?: string };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const canEdit = canMutate(session?.user?.role);
  // Filing a new request is open to any signed-in role — see
  // requireAuthenticated() in requests/actions.ts, the real enforcement
  // boundary. Editing/deleting an existing one stays Admin/Manager (canEdit).
  const canCreate = !!session?.user;

  const where: Prisma.SupportRequestWhereInput = {};
  if (params.type === "Bug" || params.type === "Feature") {
    where.type = params.type;
  }

  const [requests, merchants] = await Promise.all([
    prisma.supportRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { merchant: { select: { id: true, brandName: true, dotpeMid: true } } },
    }),
    prisma.merchant.findMany({
      select: { id: true, brandName: true, totalStores: true, totalYearlyPotential: true },
      orderBy: { brandName: "asc" },
    }),
  ]);

  const rows = requests.map((r) => ({
    ...serializeSupportRequest(r),
    merchant: r.merchant,
  }));

  const merchantOptions = merchants.map((m) => ({
    ...m,
    totalYearlyPotential: Number(m.totalYearlyPotential),
  }));

  // A merchant can have multiple request rows (one per individual ask), but
  // branches/potential describe the merchant, not the ask — count each
  // merchant's footprint once, not once per request against it. A request
  // with no real merchant (a freshly-typed name) has no shared identity to
  // dedupe against, so it falls back to its own request id as the key —
  // each such row counts on its own.
  const perMerchant = new Map<string, { totalBranches: number; totalPotential: number }>();
  for (const r of rows) {
    const key = r.merchantId ?? r.id;
    if (!perMerchant.has(key)) {
      perMerchant.set(key, { totalBranches: r.totalBranches, totalPotential: r.totalPotential });
    }
  }
  const totalBranches = Array.from(perMerchant.values()).reduce((a, r) => a + r.totalBranches, 0);
  const totalPotential = Array.from(perMerchant.values()).reduce((a, r) => a + r.totalPotential, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Bug & Feature Requests"
          description="Requests logged against merchants, with their footprint at time of filing."
        />
        {canCreate ? <RequestForm merchants={merchantOptions} /> : null}
      </div>

      <div className="mb-5">
        <RequestsFilter />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Building2} label="Total Loyalty Branches" value={formatNumber(totalBranches)} />
        <StatCard icon={IndianRupee} label="Total Potential" value={formatInr(totalPotential, { compact: true })} />
        <StatCard
          icon={params.type === "Bug" ? Bug : params.type === "Feature" ? Lightbulb : Building2}
          label="Requests"
          value={formatNumber(rows.length)}
        />
      </div>

      <RequestsTable rows={rows} merchants={merchantOptions} canEdit={canEdit} />
    </div>
  );
}
