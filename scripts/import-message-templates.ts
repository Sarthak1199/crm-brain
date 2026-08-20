import { PrismaClient } from "@prisma/client";
import { importMessageTemplates } from "../src/lib/import-templates";

const prisma = new PrismaClient();

async function main() {
  const result = await importMessageTemplates(prisma);
  console.log(`Cleared ${result.clearedExisting} existing templates.`);
  console.log(`Automation tab: ${result.automationTabCount}, Loyalty/Utility tab (unique): ${result.loyaltyTabCount}`);
  console.log(`Inserted ${result.inserted} templates, each with one Approved submission record.`);
  console.log(`  Handle = Rista by DotPe: ${result.ristaHandleCount}`);
  console.log(`  Handle = Merchant: ${result.merchantHandleCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
