import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const failures = [];
const checks = [];

function check(condition, message) {
  checks.push({ ok: Boolean(condition), message });
  if (!condition) failures.push(message);
}

async function exists(relative) {
  try { await stat(path.join(root, relative)); return true; } catch { return false; }
}

const boats = JSON.parse(await readFile(path.join(root, "packages/database/prisma/seed-data/boats.json"), "utf8"));
const stages = JSON.parse(await readFile(path.join(root, "packages/database/prisma/seed-data/stages.json"), "utf8"));
const schema = await readFile(path.join(root, "packages/database/prisma/schema.prisma"), "utf8");
const migration = await readFile(path.join(root, "packages/database/prisma/migrations/20260729183000_phase2_game/migration.sql"), "utf8");
const seed = await readFile(path.join(root, "packages/database/prisma/seed.ts"), "utf8");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

check(boats.length === 30, "Existem 30 embarcações no seed.");
check(new Set(boats.map((boat) => boat.boatNumber)).size === 30, "Os 30 números de barco são únicos.");
check(stages.length === 8, "Existem 8 etapas no seed.");
check(boats.every((boat) => boat.sourceAuditVersion === "1.2.0"), "As embarcações usam a auditoria 1.2.0.");
check(!JSON.stringify(boats).match(/tripulante|crew_name|licença desportiva/i), "O seed não contém dados pessoais de tripulantes.");
const forbiddenResultKeys = new Set(["position", "elapsed", "elapsedTime", "correctedTime", "ranking", "result", "results", "points"]);
function containsForbiddenResultKey(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenResultKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => forbiddenResultKeys.has(key) || containsForbiddenResultKey(nested));
}
check(!containsForbiddenResultKey(boats), "O seed não contém campos de resultados históricos.");

for (const model of ["PredictionMarket", "SpecialQuestion", "Prediction", "PredictionPodium", "PredictionRevision"]) {
  check(schema.includes(`model ${model} {`), `O schema contém ${model}.`);
}
check(schema.includes("@@unique([userId, marketId])"), "Existe unicidade de previsão por utilizador/mercado.");
check(schema.includes("@@unique([predictionId, boatId])"), "Existe unicidade de embarcação no pódio.");
check(migration.includes('CREATE TABLE "prediction_markets"'), "A migração cria prediction_markets.");
check(migration.includes('CREATE TABLE "predictions"'), "A migração cria predictions.");
check(migration.includes('CHECK ("position" BETWEEN 1 AND 3)'), "A base de dados limita as posições do pódio.");
check(seed.includes("prisma.predictionMarket.upsert"), "O seed cria mercados ANC/ORC.");
check(seed.includes('["predictions_enabled", false]'), "As previsões ficam desativadas por defeito.");
check(packageJson.scripts["verify:phase2"] === "node scripts/verify-phase2.mjs", "O comando verify:phase2 está configurado.");

const requiredFiles = [
  "packages/game/src/predictions.ts",
  "packages/game/tests/predictions.test.ts",
  "apps/web/src/app/jogar/actions.ts",
  "apps/web/src/app/jogar/page.tsx",
  "apps/web/src/app/etapas/page.tsx",
  "apps/web/src/app/embarcacoes/page.tsx",
  "apps/web/src/app/perfil/page.tsx",
  "apps/web/src/app/admin/etapas/page.tsx",
  "apps/web/src/app/admin/configuracao/page.tsx",
  "apps/web/src/app/api/cron/close-markets/route.ts",
  "packages/database/src/maintenance/market-closure.ts",
  "docs/PHASE2_REPORT.md",
];
for (const file of requiredFiles) check(await exists(file), `Existe ${file}.`);

async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "generated"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else result.push(full);
  }
  return result;
}

const files = await walk(root);
const projectRelativeFiles = files.map((file) => path.relative(root, file));
check(!projectRelativeFiles.some((file) => /LISTA DE INSCRITOS E TRIPULANTES/i.test(file)), "O PDF privado de tripulantes não foi incluído no projeto.");
const boatSeedText = JSON.stringify(boats);
check(!/crew_name|tripulante|licen[cç]a desportiva/i.test(boatSeedText), "O seed não contém campos individuais de tripulação.");

for (const item of checks) console.log(`${item.ok ? "✓" : "✗"} ${item.message}`);
console.log(`\n${checks.filter(({ ok }) => ok).length}/${checks.length} verificações aprovadas.`);
if (failures.length) {
  console.error("\nFalhas:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
