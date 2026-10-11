import { STARTER_TEMPLATES } from "@levelup/engine";
import { assertScriptMayRun } from "../scriptGuard";
import { seedStarterTemplate } from "../seed";

const [userId, templateId] = process.argv.slice(2);

if (!userId || !templateId) {
  console.error("Usage: pnpm --filter @levelup/db seed <userId> <templateId>");
  console.error(`Known templates: ${STARTER_TEMPLATES.map((t) => t.id).join(", ")}`);
  process.exit(1);
}

assertScriptMayRun("seed");

seedStarterTemplate(userId, templateId)
  .then(() => {
    console.log(`Seeded template "${templateId}" for user ${userId}`);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
