import fs from "node:fs";
import path from "node:path";

const required = [
  "packages/operations/src/index.ts",
  "packages/database/src/privacy/export-user-data.ts",
  "packages/database/src/privacy/request-service.ts",
  "packages/database/src/privacy/retention-service.ts",
  "packages/database/prisma/migrations/20260730023000_phase5_operations/migration.sql",
  "apps/web/src/proxy.ts",
  "apps/web/src/instrumentation.ts",
  "apps/web/src/app/api/privacy/export/route.ts",
  "apps/web/src/app/api/metrics/route.ts",
  "apps/web/src/app/perfil/privacidade/page.tsx",
  "apps/web/src/app/admin/privacidade/page.tsx",
  "scripts/backup-postgres.sh",
  "scripts/restore-postgres.sh",
  "compose.production.yml",
  "docs/PHASE5_REPORT.md",
  "docs/PRODUCTION_RUNBOOK.md",
  "docs/RGPD.md",
  "docs/BACKUP_RESTORE.md",
  "docs/INCIDENT_RESPONSE.md",
];

const checks = required.map((file) => ({
  name: `file:${file}`,
  ok: fs.existsSync(file),
}));

const schema = fs.readFileSync("packages/database/prisma/schema.prisma", "utf8");
for (const item of [
  "model DataSubjectRequest",
  "model SecurityEvent",
  "model RetentionRun",
  "model BackupRun",
  "ipHash",
  "requestId",
]) {
  checks.push({ name: `schema:${item}`, ok: schema.includes(item) });
}

const proxy = fs.readFileSync("apps/web/src/proxy.ts", "utf8");
for (const item of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "sec-fetch-site",
  "x-request-id",
]) {
  checks.push({ name: `proxy:${item}`, ok: proxy.includes(item) || fs.readFileSync("apps/web/src/lib/security/headers.ts", "utf8").includes(item) });
}

const privacyExport = fs.readFileSync("packages/database/src/privacy/export-user-data.ts", "utf8");
checks.push({
  name: "privacy:no-token-hashes-exported",
  ok: !privacyExport.includes("tokenHash: true") && !privacyExport.includes("passwordHash: true"),
});

const allTextFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|json|md|sql|yml|yaml|sh)$/.test(entry.name)) allTextFiles.push(full);
  }
}
walk(".");
const historicalResults = allTextFiles
  .filter((file) => !file.includes("docs/") && !file.endsWith("scripts/verify-phase5.mjs"))
  .some((file) => fs.readFileSync(file, "utf8").includes("VAP - Etapa 4 - Classe"));
checks.push({ name: "data:no-historical-results-imported", ok: !historicalResults });

const failed = checks.filter((check) => !check.ok);
const result = {
  phase: 5,
  checkedAt: new Date().toISOString(),
  checks: checks.length,
  passed: checks.length - failed.length,
  failed,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
