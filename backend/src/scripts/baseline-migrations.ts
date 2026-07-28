import { execSync } from "child_process";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

const MIGRATIONS = [
  "1782981207_add_refuge_models",
  "1782988791_add_refuge_guesses",
  "1783669325_add_animal_age_months",
  "1784193700_add_refuge_reveal_consent",
  "1784215533_add_refuge_day_results",
  "1784719242_add_message_read_tracking",
  "1784725645_bottle_reveal_mechanism",
  "1784728901_bottle_reveal_to_match",
  "1785075147_add_weekly_profile_vote",
  "1785139477_weekly_profile_duel",
  "1785305000_weekly_profile_duel_ticket",
  "20260100000000_init",
  "20260410000000_phase5_salon_cms",
  "20260411000000_phase10_notifications",
  "20260422000000_add_profile_v1_fields",
  "20260426000000_add_reactions",
  "20260427000000_add_question_attempts",
  "20260427000100_add_blur_medium_path",
  "20260429000000_add_card_game",
  "20260430000000_add_push_tokens",
  "20260511000000_add_show_photo_by_default",
  "20260601000000_add_salon_sessions_encounters",
  "20260602000000_add_bottle_tables",
  "20260602000001_add_sender_city",
  "20260602000002_add_offering_consumption",
  "20260602000003_add_salon_createdat",
  "20260603000000_seed_salons",
  "20260608000000_add_psy_salon",
  "20260608000001_ensure_psy_enum",
  "20260609000000_link_messages_to_sessions",
  "20260610000000_add_background_to_refuge_session",
];

async function main() {
  if (process.env.RUN_MIGRATION_BASELINE !== "true") {
    console.log("[baseline] RUN_MIGRATION_BASELINE not 'true'. Exiting gracefully.");
    process.exit(0);
  }

  console.log("[baseline] Starting baseline migration process...\n");

  // Pre-flight checks
  try {
    console.log("[baseline] Pre-flight checks:");

    const duelCheck = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'WeeklyProfileDuel'`
    );
    if (duelCheck.length === 0 || Number(duelCheck[0]!.count) === 0) throw new Error("WeeklyProfileDuel missing");
    console.log("  ✅ WeeklyProfileDuel exists");

    const voteCheck = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'WeeklyProfileVote'`
    );
    if (voteCheck.length > 0 && Number(voteCheck[0]!.count) !== 0) throw new Error("WeeklyProfileVote still exists");
    console.log("  ✅ WeeklyProfileVote removed");

    const salonCount = await prisma.salon.count();
    if (salonCount !== 7) throw new Error(`Expected 7 salons, got ${salonCount}`);
    console.log("  ✅ 7 salons exist");

    const psyCheck = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) as count FROM pg_enum WHERE enumlabel = 'PSY'`
    );
    if (psyCheck.length === 0 || Number(psyCheck[0]!.count) === 0) throw new Error("PSY enum missing");
    console.log("  ✅ PSY enum exists\n");
  } catch (err: any) {
    console.error("[baseline] ❌ Pre-flight check failed:", err.message);
    process.exit(1);
  }

  // Get existing migrations (for idempotency)
  let existing = new Set<string>();
  try {
    const tableExists = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '_prisma_migrations'`
    );
    if (tableExists.length > 0 && Number(tableExists[0]!.count) > 0) {
      const rows = await prisma.$queryRaw<Array<{ migration: string }>>(
        Prisma.sql`SELECT migration FROM "_prisma_migrations" ORDER BY migration ASC`
      );
      existing = new Set(rows.map((r: { migration: string }) => r.migration));
      console.log(`[baseline] Found ${existing.size} existing migrations in database\n`);
    }
  } catch (err) {
    console.log("[baseline] _prisma_migrations table doesn't exist yet (will be created)\n");
  }

  // Apply migrations via prisma migrate resolve
  let applied = 0;
  let skipped = 0;
  const failed: string[] = [];

  console.log("[baseline] Registering migrations:\n");
  for (const migration of MIGRATIONS) {
    if (existing.has(migration)) {
      console.log(`  ⏭️  ${migration} (already registered)`);
      skipped++;
      continue;
    }

    try {
      console.log(`  ▶️  ${migration}...`);
      execSync(`npx prisma migrate resolve --applied "${migration}"`, {
        stdio: "pipe",
        timeout: 10000,
        encoding: "utf-8",
      });
      console.log(`      ✅ registered`);
      applied++;
    } catch (err: any) {
      console.error(`      ❌ FAILED: ${err.message}`);
      failed.push(migration);
    }
  }

  console.log(`\n[baseline] Results:`);
  console.log(`  Applied: ${applied}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed.length}\n`);

  if (failed.length > 0) {
    console.error(`[baseline] ❌ Failed migrations (resume with RUN_MIGRATION_BASELINE=true):`);
    failed.forEach((m) => console.error(`    - ${m}`));
    process.exit(1);
  }

  // Final verification
  console.log(`[baseline] Final verification:\n`);
  try {
    const finalCount = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) as count FROM "_prisma_migrations"`
    );
    const count = finalCount.length > 0 ? Number(finalCount[0]!.count) : 0;
    if (count !== 31) {
      throw new Error(`Expected 31 migrations in database, found ${count}`);
    }

    const finalList = await prisma.$queryRaw<Array<{ migration: string }>>(
      Prisma.sql`SELECT migration FROM "_prisma_migrations" ORDER BY migration ASC`
    );

    console.log(`✅ All 31 migrations registered in _prisma_migrations\n`);
    console.log(`[baseline] Migration registry:\n`);
    finalList.forEach((m: { migration: string }, i: number) => {
      console.log(`  ${String(i + 1).padStart(2)}. ${m.migration}`);
    });
  } catch (err: any) {
    console.error("[baseline] ❌ Final verification failed:", err.message);
    process.exit(1);
  }

  console.log(`\n[baseline] ✅ Baseline completed successfully!`);
  console.log(`[baseline] Next step: Set RUN_MIGRATION_BASELINE=false on Render and restart.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[baseline] Unhandled error:", err);
  process.exit(1);
});
