import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  // Fail-closed local database target guard (SEED-02)
  // Must execute BEFORE Prisma client is imported or connected
  const { assertLocalDatabaseTarget } = await import(
    "@/features/invitations/db-guard"
  );
  assertLocalDatabaseTarget(process.env.DATABASE_URL);

  const { executeSeed } = await import("@/features/invitations/seed");
  const { prisma } = await import("@/lib/server/db");

  try {
    console.log("=== AyaWarta Database Seed Starting ===");
    const result = await executeSeed();
    console.log("=== AyaWarta Database Seed Completed Successfully ===");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("=== AyaWarta Database Seed Failed ===");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
