import { PrismaClient, CrmTarget, CrmStatus, LoyaltyStatus, WabaStatus, OnboardStatus, RistaStatus, DotpeStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedSnapshots(merchantId: string, base: { campaigns: number; loyalty: number; automations: number }) {
  const weeks = 8;
  for (let w = weeks; w >= 0; w--) {
    const capturedAt = daysAgo(w * 7);
    const growth = (weeks - w) / weeks;
    const campaigns = Math.round(base.campaigns * (0.4 + 0.6 * growth) * (0.85 + Math.random() * 0.3));
    const loyalty = Math.round(base.loyalty * (0.4 + 0.6 * growth) * (0.85 + Math.random() * 0.3));
    const automations = Math.round(base.automations * (0.4 + 0.6 * growth) * (0.85 + Math.random() * 0.3));
    const total = campaigns + loyalty + automations;

    await prisma.merchantSnapshot.createMany({
      data: [
        { merchantId, fieldName: "creditConsumption.total", value: total, capturedAt },
        { merchantId, fieldName: "creditConsumption.campaigns", value: campaigns, capturedAt },
        { merchantId, fieldName: "creditConsumption.loyalty", value: loyalty, capturedAt },
        { merchantId, fieldName: "creditConsumption.automations", value: automations, capturedAt },
      ],
    });
  }
}

async function main() {
  console.log("Seeding users...");
  const passwordHash = await bcrypt.hash("dotpe1234", 10);
  await prisma.user.upsert({
    where: { email: "sarthak.gupta@dotpe.in" },
    update: {},
    create: {
      email: "sarthak.gupta@dotpe.in",
      name: "Sarthak Gupta",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log("Seeding merchants...");

  await prisma.merchantSnapshot.deleteMany({});
  await prisma.merchant.deleteMany({});

  const merchants = [
    {
      ristaBrandId: "RB-1001",
      dotpeMid: "MID-1001",
      brandName: "Punjab Grill",
      pocName: "Rohit Malhotra",
      pocNumber: "+91 98100 11223",
      totalStores: 42,
      activeDineInStores: 38,
      loyaltyActiveStores: 35,
      pendingBranches: 38,
      paymentCollectedDate: daysAgo(120),
      closureDate: null,
      paymentCollected: 380000,
      reeloBranches: 0,
      xenoBranches: 2,
      dotpeBranches: 38,
      fudrBranches: 0,
      easyrewardsBranches: 0,
      crmTarget: CrmTarget.Yes,
      lastDemoStatus: daysAgo(150),
      crmStatus: CrmStatus.Active,
      crmEnabledOn: daysAgo(118),
      loyaltyStatus: LoyaltyStatus.Active,
      wabaStatus: WabaStatus.Active,
      onboarded: OnboardStatus.Onboarded,
      ristaStatus: RistaStatus.Active,
      dotpeStatus: DotpeStatus.Active,
      customerCount: 128400,
      l30Txn: 19200,
      preCrmCredits: 40000,
      postCrmCredits: 210000,
      momCreditConsumption: 31500,
      creditConsumptionBreakup: { total: 31500, campaigns: 14200, loyalty: 11800, automations: 5500 },
      totalContactsReached: 84200,
      loyaltyProgram: "PG Rewards Club",
      loyaltyPointsEarned: 512000,
      loyaltyPointsBurned: 298000,
      automationsRules: ["Birthday reward", "Win-back 30d", "Post-visit thank you", "Low-balance nudge"],
      automationsActivateDate: daysAgo(110),
      automationsTotalSent: 61200,
      campaignsSetup: 24,
      campaignsContactsReached: 71400,
      campaignsUsingRfm: 16,
      bugRaised: "WABA template rejected for two branches — resubmitted 2026-08-10.",
      featureRequest: "Wants branch-level campaign scheduling.",
      snapshotBase: { campaigns: 14200, loyalty: 11800, automations: 5500 },
    },
    {
      ristaBrandId: "RB-1002",
      dotpeMid: "MID-1002",
      brandName: "Barbeque Nation",
      pocName: "Anjali Verma",
      pocNumber: "+91 98200 33445",
      totalStores: 96,
      activeDineInStores: 88,
      loyaltyActiveStores: 40,
      pendingBranches: 40,
      paymentCollectedDate: daysAgo(45),
      closureDate: null,
      paymentCollected: 400000,
      reeloBranches: 12,
      xenoBranches: 0,
      dotpeBranches: 40,
      fudrBranches: 0,
      easyrewardsBranches: 0,
      crmTarget: CrmTarget.Yes,
      lastDemoStatus: daysAgo(70),
      crmStatus: CrmStatus.NA,
      crmEnabledOn: daysAgo(44),
      loyaltyStatus: LoyaltyStatus.Active,
      wabaStatus: WabaStatus.Inactive,
      onboarded: OnboardStatus.Onboarded,
      ristaStatus: RistaStatus.Active,
      dotpeStatus: DotpeStatus.Inactive,
      customerCount: 61300,
      l30Txn: 8400,
      preCrmCredits: 15000,
      postCrmCredits: 42000,
      momCreditConsumption: 9800,
      creditConsumptionBreakup: { total: 9800, campaigns: 3200, loyalty: 5100, automations: 1500 },
      totalContactsReached: 22100,
      loyaltyProgram: "BBQ Nation Feast Points",
      loyaltyPointsEarned: 184000,
      loyaltyPointsBurned: 92000,
      automationsRules: ["Birthday reward", "Win-back 30d"],
      automationsActivateDate: daysAgo(40),
      automationsTotalSent: 9800,
      campaignsSetup: 6,
      campaignsContactsReached: 15200,
      campaignsUsingRfm: 2,
      bugRaised: null,
      featureRequest: "Asked for WABA rollout timeline before expanding pilot.",
      snapshotBase: { campaigns: 3200, loyalty: 5100, automations: 1500 },
    },
    {
      ristaBrandId: "RB-1003",
      dotpeMid: "MID-1003",
      brandName: "Cafe Delhi Heights",
      pocName: "Karan Bhatia",
      pocNumber: "+91 98300 55667",
      totalStores: 18,
      activeDineInStores: 16,
      loyaltyActiveStores: 0,
      pendingBranches: 0,
      paymentCollectedDate: null,
      closureDate: null,
      paymentCollected: 0,
      reeloBranches: 5,
      xenoBranches: 5,
      dotpeBranches: 0,
      fudrBranches: 3,
      easyrewardsBranches: 0,
      crmTarget: CrmTarget.Maybe,
      lastDemoStatus: daysAgo(12),
      crmStatus: CrmStatus.NA,
      crmEnabledOn: null,
      loyaltyStatus: LoyaltyStatus.Inactive,
      wabaStatus: WabaStatus.Inactive,
      onboarded: OnboardStatus.NotOnboarded,
      ristaStatus: RistaStatus.Inactive,
      dotpeStatus: DotpeStatus.Inactive,
      customerCount: 0,
      l30Txn: 0,
      preCrmCredits: 0,
      postCrmCredits: 0,
      momCreditConsumption: 0,
      creditConsumptionBreakup: { total: 0, campaigns: 0, loyalty: 0, automations: 0 },
      totalContactsReached: 0,
      loyaltyProgram: null,
      loyaltyPointsEarned: 0,
      loyaltyPointsBurned: 0,
      automationsRules: [],
      automationsActivateDate: null,
      automationsTotalSent: 0,
      campaignsSetup: 0,
      campaignsContactsReached: 0,
      campaignsUsingRfm: 0,
      bugRaised: null,
      featureRequest: null,
      snapshotBase: { campaigns: 0, loyalty: 0, automations: 0 },
    },
    {
      ristaBrandId: "RB-1004",
      dotpeMid: "MID-1004",
      brandName: "Wow! Momo",
      pocName: "Priya Nair",
      pocNumber: "+91 98400 77889",
      totalStores: 210,
      activeDineInStores: 60,
      loyaltyActiveStores: 0,
      pendingBranches: 0,
      paymentCollectedDate: null,
      closureDate: daysAgo(20),
      paymentCollected: 0,
      reeloBranches: 0,
      xenoBranches: 0,
      dotpeBranches: 60,
      fudrBranches: 0,
      easyrewardsBranches: 40,
      crmTarget: CrmTarget.No,
      lastDemoStatus: daysAgo(90),
      crmStatus: CrmStatus.NA,
      crmEnabledOn: null,
      loyaltyStatus: LoyaltyStatus.Inactive,
      wabaStatus: WabaStatus.Inactive,
      onboarded: OnboardStatus.NotOnboarded,
      ristaStatus: RistaStatus.Active,
      dotpeStatus: DotpeStatus.Active,
      customerCount: 4200,
      l30Txn: 610,
      preCrmCredits: 0,
      postCrmCredits: 0,
      momCreditConsumption: 0,
      creditConsumptionBreakup: { total: 0, campaigns: 0, loyalty: 0, automations: 0 },
      totalContactsReached: 0,
      loyaltyProgram: null,
      loyaltyPointsEarned: 0,
      loyaltyPointsBurned: 0,
      automationsRules: [],
      automationsActivateDate: null,
      automationsTotalSent: 0,
      campaignsSetup: 0,
      campaignsContactsReached: 0,
      campaignsUsingRfm: 0,
      bugRaised: "Rista sync dropped 3 branches after POS upgrade.",
      featureRequest: null,
      snapshotBase: { campaigns: 0, loyalty: 0, automations: 0 },
    },
    {
      ristaBrandId: "RB-1005",
      dotpeMid: "MID-1005",
      brandName: "Chaayos",
      pocName: "Devika Rao",
      pocNumber: "+91 98500 99001",
      totalStores: 260,
      activeDineInStores: 240,
      loyaltyActiveStores: 200,
      pendingBranches: 200,
      paymentCollectedDate: daysAgo(300),
      closureDate: daysAgo(15),
      paymentCollected: 2000000,
      reeloBranches: 0,
      xenoBranches: 0,
      dotpeBranches: 200,
      fudrBranches: 0,
      easyrewardsBranches: 0,
      crmTarget: CrmTarget.Yes,
      lastDemoStatus: daysAgo(320),
      crmStatus: CrmStatus.Active,
      crmEnabledOn: daysAgo(298),
      loyaltyStatus: LoyaltyStatus.Active,
      wabaStatus: WabaStatus.Active,
      onboarded: OnboardStatus.Onboarded,
      ristaStatus: RistaStatus.Active,
      dotpeStatus: DotpeStatus.Active,
      customerCount: 640200,
      l30Txn: 2400,
      preCrmCredits: 180000,
      postCrmCredits: 210000,
      momCreditConsumption: 1200,
      creditConsumptionBreakup: { total: 1200, campaigns: 300, loyalty: 700, automations: 200 },
      totalContactsReached: 410000,
      loyaltyProgram: "Chaayos Chai Points",
      loyaltyPointsEarned: 2100000,
      loyaltyPointsBurned: 1950000,
      automationsRules: ["Birthday reward", "Win-back 30d", "Post-visit thank you"],
      automationsActivateDate: daysAgo(280),
      automationsTotalSent: 320000,
      campaignsSetup: 58,
      campaignsContactsReached: 402000,
      campaignsUsingRfm: 40,
      bugRaised: null,
      featureRequest: "Churned — contract lapsed, exploring renewal at lower branch tier.",
      snapshotBase: { campaigns: 12000, loyalty: 9000, automations: 3000 },
    },
  ];

  for (const m of merchants) {
    const { snapshotBase, ...data } = m;
    const totalYearlyPotential = data.activeDineInStores * 10000;
    const created = await prisma.merchant.create({
      data: { ...data, totalYearlyPotential },
    });
    await seedSnapshots(created.id, snapshotBase);
    console.log(`  + ${created.brandName}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
