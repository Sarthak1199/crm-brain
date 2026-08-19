"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { Section, Field } from "@/components/detail-panel";
import { formatDate, formatInr, formatNumber } from "@/lib/format";
import { automationRuleLabel } from "@/lib/automation-rule-labels";
import type { MerchantRow } from "./merchant-table";

export function MerchantDetailSheet({
  row,
  onOpenChange,
}: {
  row: MerchantRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const m = row?.merchant;
  const breakup = (m?.creditConsumptionBreakup ?? null) as
    | { total?: number; campaigns?: number; loyalty?: number; automations?: number }
    | null;
  const automationRules = (m?.automationsRules ?? []) as string[];

  return (
    <Sheet open={!!row} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-xl">
        {m ? (
          <>
            <SheetHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-[18px]">{m.brandName}</SheetTitle>
                <StatusBadge value={m.crmStatus} />
              </div>
              <SheetDescription>
                {m.dotpeMid}
                {m.ristaBrandId ? ` · Rista ${m.ristaBrandId}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="px-4">
              <Section title="Identity">
                <Field label="Rista Brand ID" value={m.ristaBrandId} />
                <Field label="DotPe MID" value={m.dotpeMid} />
                <Field label="POC Name" value={m.pocName} />
                <Field label="POC Number" value={m.pocNumber} />
              </Section>

              <Section title="Footprint">
                <Field label="Total Stores" value={formatNumber(m.totalStores)} />
                <Field label="Active Dine-in Stores" value={formatNumber(m.activeDineInStores)} />
                <Field label="Loyalty Active Stores" value={formatNumber(m.loyaltyActiveStores)} />
                <Field label="Paid Branches" value={formatNumber(m.paidBranches)} />
                <Field label="Closed Branches" value={formatNumber(m.closedBranches)} />
              </Section>

              <Section title="Commercials">
                <Field label="Payment Collected Date" value={formatDate(m.paymentCollectedDate)} />
                <Field label="Closure Date" value={formatDate(m.closureDate)} />
                <Field label="Payment Collected" value={formatInr(m.paymentCollected)} />
                <Field label="Total Yearly Potential" value={formatInr(m.totalYearlyPotential)} />
                <Field label="Subscription Revenue" value={formatInr(m.subscriptionRevenue)} />
                <Field label="Credit Consumed (L30)" value={formatInr(m.creditConsumedL30)} />
              </Section>

              <Section title="Competitor Presence">
                <Field label="Reelo Branches" value={formatNumber(m.reeloBranches)} />
                <Field label="Xeno Branches" value={formatNumber(m.xenoBranches)} />
                <Field label="DotPe Branches" value={formatNumber(m.dotpeBranches)} />
                <Field label="Fudr Branches" value={formatNumber(m.fudrBranches)} />
                <Field label="EasyRewards Branches" value={formatNumber(m.easyrewardsBranches)} />
              </Section>

              <Section title="Sales / CRM Status">
                <Field label="CRM Target" value={<StatusBadge value={m.crmTarget} />} />
                <Field label="Last Demo" value={formatDate(m.lastDemoStatus)} />
                <Field label="CRM License" value={<StatusBadge value={m.crmStatus} />} />
                <Field label="CRM Enabled On" value={formatDate(m.crmEnabledOn)} />
                <Field
                  label="Loyalty License"
                  value={<StatusBadge value={row.loyaltyLicensed ? "Active" : "Inactive"} />}
                />
                <Field label="WABA Status" value={<StatusBadge value={m.wabaStatus} />} />
                <Field label="Onboarded" value={<StatusBadge value={m.onboarded} />} />
                <Field label="Rista Status" value={<StatusBadge value={m.ristaStatus} />} />
                <Field label="DotPe Status" value={<StatusBadge value={m.dotpeStatus} />} />
              </Section>

              <Section title="Usage">
                <Field label="Loyalty Usage" value={<StatusBadge value={m.loyaltyStatus} />} />
                <Field label="Customer Count" value={formatNumber(m.customerCount)} />
                <Field label="L30 Txn" value={formatNumber(m.l30Txn)} />
                <Field label="Pre-CRM Credits" value={formatInr(m.preCrmCredits)} />
                <Field label="Post-CRM Credits" value={formatInr(m.postCrmCredits)} />
                <Field label="MoM Credit Consumption" value={formatInr(m.momCreditConsumption)} />
                <Field label="Total Contacts Reached" value={formatNumber(m.totalContactsReached)} />
              </Section>

              {breakup ? (
                <Section title="Credit Consumption Trend">
                  <div className="col-span-2 -mt-1">
                    <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>Weekly total credits used</span>
                      <span className="font-medium text-foreground">
                        {formatInr(breakup.total ?? 0)}
                      </span>
                    </div>
                    {row.snapshots.length > 1 ? (
                      <div className="h-14 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={row.snapshots}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="var(--color-primary)"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-[12px] text-muted-foreground">
                        Not enough history yet.
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-muted px-2.5 py-2">
                        <p className="text-[11px] text-muted-foreground">Campaigns</p>
                        <p className="text-[13px] font-medium text-foreground">
                          {formatInr(breakup.campaigns ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted px-2.5 py-2">
                        <p className="text-[11px] text-muted-foreground">Loyalty</p>
                        <p className="text-[13px] font-medium text-foreground">
                          {formatInr(breakup.loyalty ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted px-2.5 py-2">
                        <p className="text-[11px] text-muted-foreground">Automations</p>
                        <p className="text-[13px] font-medium text-foreground">
                          {formatInr(breakup.automations ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Section>
              ) : null}

              <Section title="Loyalty">
                <Field label="Loyalty Program" value={m.loyaltyProgram} />
                <Field label="Points Earned" value={formatNumber(m.loyaltyPointsEarned)} />
                <Field label="Points Burned" value={formatNumber(m.loyaltyPointsBurned)} />
              </Section>

              <Section title="Automations">
                <div className="col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Active Rules
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {automationRules.length ? (
                      automationRules.map((rule) => (
                        <span
                          key={rule}
                          className="rounded-full border border-border bg-muted px-2 py-0.5 text-[12px] text-foreground"
                        >
                          {automationRuleLabel(rule)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[13px] text-muted-foreground">None configured</span>
                    )}
                  </dd>
                </div>
                <Field label="Activated On" value={formatDate(m.automationsActivateDate)} />
                <Field label="Total Sent" value={formatNumber(m.automationsTotalSent)} />
              </Section>

              <Section title="Campaigns">
                <Field label="Campaigns Setup" value={formatNumber(m.campaignsSetup)} />
                <Field label="Contacts Reached" value={formatNumber(m.campaignsContactsReached)} />
                <Field label="Using RFM" value={formatNumber(m.campaignsUsingRfm)} />
              </Section>

              <Section title="Support">
                <div className="col-span-2">
                  <Field label="Bug Raised" value={m.bugRaised} />
                </div>
                <div className="col-span-2 mt-3">
                  <Field label="Feature Request" value={m.featureRequest} />
                </div>
              </Section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
