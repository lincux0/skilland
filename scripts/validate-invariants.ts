import { getAllSkills } from "../src/lib/skills";

const skills = getAllSkills();
let errors = 0;

function check(condition: boolean, message: string) {
  if (condition) return;
  errors++;
  console.error(`  ✗ ${message}`);
}

/**
 * Invariants from PROJECT_RESEARCH_AND_PLAN_v1.1.md §6.4.
 * A failing invariant blocks the build instead of publishing an
 * inconsistent claim about which version was scanned or reviewed.
 */
for (const skill of skills) {
  const label = skill.publicId;
  const reviewed = skill.review.reviewed;

  if (reviewed) {
    check(
      reviewed.scan.scannedCommit === reviewed.commit,
      `${label}: reviewed scan commit ${reviewed.scan.scannedCommit.slice(0, 8)} != reviewed commit ${reviewed.commit.slice(0, 8)}`,
    );
    check(
      reviewed.scan.scannedBundleHash === reviewed.bundleHash,
      `${label}: reviewed scan bundle != reviewed bundle`,
    );
    check(reviewed.scan.status !== "failed", `${label}: reviewed snapshot has a failed scan`);
    check(
      reviewed.licenseStatus !== "unknown" && reviewed.licenseStatus !== "conflict",
      `${label}: reviewed snapshot has license status "${reviewed.licenseStatus}"`,
    );
  }

  if (skill.review.status === "human-approved") {
    check(
      reviewed?.bundleHash === skill.snapshot.bundleHash,
      `${label}: human-approved but reviewed bundle != current snapshot bundle`,
    );
  }

  if (skill.scan.status === "complete") {
    check(
      skill.scan.scannedCommit === skill.snapshot.commit,
      `${label}: complete scan was made on ${skill.scan.scannedCommit.slice(0, 8)}, snapshot is ${skill.snapshot.commit.slice(0, 8)}`,
    );
    check(
      skill.scan.scannedBundleHash === skill.snapshot.bundleHash,
      `${label}: complete scan bundle != snapshot bundle`,
    );
  }

  if (skill.catalog.publishedVersion) {
    check(
      skill.catalog.publishedBundleHash === reviewed?.bundleHash,
      `${label}: catalog publishes a bundle that is not the reviewed bundle`,
    );
  }

  if (skill.status === "published") {
    check(Boolean(reviewed), `${label}: published without a reviewed snapshot`);
    check(reviewed?.scan.status !== "failed", `${label}: published with a failed reviewed scan`);
  }

  if (skill.scan.flags.some((flag) => flag.severity === "critical")) {
    check(
      skill.status === "quarantined",
      `${label}: critical flag present but status is "${skill.status}"`,
    );
  }

  if (skill.review.status === "stale") {
    check(
      Boolean(reviewed) && skill.install.useCommand.includes(reviewed!.commit),
      `${label}: stale review must install the reviewed commit, not the synced commit`,
    );
  }

  if (skill.status === "quarantined") {
    check(!skill.catalog.eligible, `${label}: quarantined skill must not be catalog-eligible`);
  }
}

const summary = {
  skills: skills.length,
  reviewed: skills.filter((skill) => skill.review.status === "human-approved").length,
  stale: skills.filter((skill) => skill.review.status === "stale").length,
  machineScanned: skills.filter((skill) => skill.review.status === "machine-scanned").length,
  scanMatchesSnapshot: skills.filter((skill) => skill.versions.consistency.scanMatchesSnapshot).length,
  upstreamAhead: skills.filter((skill) => skill.versions.consistency.upstreamAhead).length,
};

console.log("version invariants:");
for (const [key, value] of Object.entries(summary)) console.log(`  ${key}: ${value}`);

if (errors > 0) {
  console.error(`\n${errors} invariant violation(s)`);
  process.exit(1);
}

console.log("\nInvariants passed.");
