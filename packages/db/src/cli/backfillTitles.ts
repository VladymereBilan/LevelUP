import { backfillTitlesForUser } from "../backfillTitles";
import { assertScriptMayRun } from "../scriptGuard";

const [userId] = process.argv.slice(2);

if (!userId) {
  console.error("Usage: pnpm --filter @levelup/db backfill-titles <userId>");
  process.exit(1);
}

assertScriptMayRun("backfill-titles");

backfillTitlesForUser(userId)
  .then((result) => {
    if (result.titlesUnlocked.length === 0) {
      console.log(`No new titles to award for user ${userId}.`);
      return;
    }
    console.log(
      `Awarded ${result.titlesUnlocked.length} title(s) to user ${userId}: ` +
        result.titlesUnlocked.map((title) => title.name).join(", "),
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
