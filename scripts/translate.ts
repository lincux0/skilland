import { backfillTranslations, describeStats } from "./lib/translate";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const providerArg = process.argv
  .find((arg) => arg.startsWith("--provider="))
  ?.slice("--provider=".length);
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length);

const provider =
  providerArg === "google" || providerArg === "mymemory" ? providerArg : "auto";

const stats = await backfillTranslations({
  dryRun,
  force,
  provider,
  limit: limitArg ? Number(limitArg) : undefined,
  log: (message) => console.log(message),
});

console.log(describeStats(stats));
if (stats.failed > 0) process.exitCode = 1;
