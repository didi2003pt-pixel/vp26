import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const failures = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

function check(name, condition, detail = "") {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function json(relative) {
  return JSON.parse(read(relative));
}

const requiredFiles = [
  "packages/scoring/src/engine.ts",
  "packages/scoring/src/special-answer.ts",
  "packages/sailti/src/csv.ts",
  "packages/sailti/src/json.ts",
  "packages/sailti/src/xrr.ts",
  "packages/sailti/src/matcher.ts",
  "packages/sailti/fixtures/example-results.xrr.xml",
  "packages/sailti/tests/xrr.test.ts",
  "packages/database/src/results/import-service.ts",
  "packages/database/src/results/scoring-service.ts",
  "packages/database/src/results/ranking-service.ts",
  "packages/database/src/results/recalculate-pending.ts",
  "packages/database/prisma/migrations/20260729211500_phase3_results_scoring/migration.sql",
  "apps/web/src/app/admin/resultados/page.tsx",
  "apps/web/src/app/admin/pontuacao/page.tsx",
  "apps/web/src/app/classificacoes/page.tsx",
  "apps/web/src/app/classificacoes/cidades/page.tsx",
  "apps/web/src/app/classificacoes/clubes/page.tsx",
  "apps/web/src/app/api/cron/recalculate-results/route.ts",
  "docs/RESULTS_IMPORT.md",
  "docs/SCORING_ENGINE.md",
  "docs/RANKINGS.md",
];
for (const file of requiredFiles) check(`ficheiro ${file}`, exists(file));

const schema = read("packages/database/prisma/schema.prisma");
for (const model of [
  "ResultImport", "ResultImportRow", "StageResult", "StageResultEntry",
  "ScoringRuleSet", "ScoringRule", "CalculationRun", "ScoreEvent",
  "UserStageScore", "UserTotalScore", "RankingSnapshot", "RankingSnapshotEntry",
]) check(`modelo Prisma ${model}`, schema.includes(`model ${model} {`));
check(
  "idempotência da importação inclui etapa e classe",
  schema.includes("@@unique([provider, sourceHash, stageId, classId])"),
);
check("posição de resultado permite empates", !schema.includes("@@unique([resultId, position])"));
check("número de embarcação único por resultado", schema.includes("@@unique([resultId, boatId])"));
check("pontuação de etapa única por utilizador/mercado", schema.includes("@@unique([userId, marketId])"));
check("mercado fixa versão das regras", schema.includes("scoringRuleSetId") && schema.includes("scoringRuleSet         ScoringRuleSet?"));
check("ranking suporta estado substituído", schema.includes("enum RankingStatus") && schema.includes("SUPERSEDED"));

const migration = read("packages/database/prisma/migrations/20260729211500_phase3_results_scoring/migration.sql");
for (const table of [
  "result_imports", "result_import_rows", "stage_results", "stage_result_entries",
  "scoring_rule_sets", "scoring_rules", "calculation_runs", "score_events",
  "user_stage_scores", "user_total_scores", "ranking_snapshots", "ranking_snapshot_entries",
]) check(`migração cria ${table}`, migration.includes(`CREATE TABLE "${table}"`));
check(
  "migração de importação com chave contextual",
  migration.includes('UNIQUE ("provider", "source_hash", "stage_id", "class_id")'),
);

const boats = json("packages/database/prisma/seed-data/boats.json");
const stages = json("packages/database/prisma/seed-data/stages.json");
check("30 embarcações no seed", boats.length === 30, `obtidas ${boats.length}`);
check("30 números de barco únicos", new Set(boats.map((boat) => boat.boatNumber)).size === 30);
check("22 ANC no seed", boats.filter((boat) => boat.classCode.startsWith("ANC")).length === 22);
check("8 ORC no seed", boats.filter((boat) => boat.classCode === "ORC").length === 8);
check("8 etapas no seed", stages.length === 8, `obtidas ${stages.length}`);
check("etapas numeradas 1–8", stages.map((stage) => stage.number).join(",") === "1,2,3,4,5,6,7,8");

const seed = read("packages/database/prisma/seed.ts");
const scoringRules = {
  WINNER_EXACT: 100,
  PODIUM_EXACT_SECOND: 75,
  PODIUM_EXACT_THIRD: 75,
  PODIUM_WRONG_POSITION: 40,
  SURPRISE_TOP_FIVE: 60,
  SPECIAL_QUESTION_CORRECT: 50,
  ALL_ELIGIBLE_STAGES_BONUS: 100,
};
for (const [code, points] of Object.entries(scoringRules)) {
  check(`regra ${code}=${points}`, seed.includes(`["${code}", ${points}]`));
}
for (const flag of ["result_imports_enabled", "results_enabled", "rankings_enabled", "sailti_sync_enabled"]) {
  check(`feature flag ${flag} desligada`, seed.includes(`["${flag}", false]`));
}
check("seed não cria StageResult", !seed.includes("prisma.stageResult.create"));
check("seed não cria ScoreEvent", !seed.includes("prisma.scoreEvent.create"));

const importService = read("packages/database/src/results/import-service.ts");
check("confirmação exige mercado fechado", importService.includes('market.status !== "CLOSED"'));
check("associação manual valida elegibilidade", importService.includes("A embarcação selecionada não é elegível"));
check("fonte original recebe SHA-256", importService.includes('createHash("sha256")'));
check("confirmação usa Serializable", importService.includes("TransactionIsolationLevel.Serializable"));
check("confirmação repete P2034", importService.includes('error.code === "P2034"'));
check("resposta especial auditada", importService.includes("RESULT_IMPORT_SPECIAL_ANSWER_SET"));

const scoring = read("packages/scoring/src/engine.ts");
check("motor impede acumulação exata/posição errada", scoring.includes("continue;") && scoring.includes("PODIUM_WRONG_POSITION"));
check("validação deteta embarcação repetida", scoring.includes("Embarcação repetida"));
check("resultado exige vencedor", scoring.includes("não contém vencedor classificado"));

const ranking = read("packages/database/src/results/ranking-service.ts");
check("ranking geral por classe", ranking.includes('scope: "GENERAL"'));
check("ranking por etapa", ranking.includes('scope: "STAGE"'));
check("ranking de cidade", ranking.includes('scope: "CITY"'));
check("ranking de clube", ranking.includes('scope: "CLUB"'));
check("snapshots antigos podem ser substituídos", importService.includes('status: "SUPERSEDED"'));
check("comunidades usam top 10", ranking.includes("slice(0, 10)") && ranking.includes("average_top_10"));

const providers = read("packages/sailti/src/providers.ts");
check("fornecedor de ficheiros", providers.includes("class SailtiFileProvider"));
check("fornecedor XRR explícito", providers.includes("class SailtiXrrProvider"));
check("contrato de fornecedor completo", ["fetchCompetition", "fetchStages", "fetchEntries", "fetchResults", "downloadSource"].every((method) => read("packages/sailti/src/types.ts").includes(`${method}(`)));
check("API reservada sem simulação", providers.includes("API Sailti não configurada"));
check("HTML desativado sem autorização", providers.includes("Leitura HTML desativada"));

const fixtureJson = read("packages/sailti/fixtures/example-results.json");
const fixtureCsv = read("packages/sailti/fixtures/example-results.csv");
check("fixtures explicitamente de teste", fixtureJson.includes('"classCode": "TEST"') && fixtureCsv.includes("POR TEST"));
for (const realName of ["Allaboard49", "Häcker Kitchen", "Pocket Rocket", "Farofino"]) {
  check(`fixture não usa ${realName}`, !fixtureJson.includes(realName) && !fixtureCsv.includes(realName));
}

const allTextFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|json|md|csv|sql|yml|yaml|toml|env|example)$/i.test(entry.name)) allTextFiles.push(full);
  }
}
walk(root);
const combined = allTextFiles.filter((file) => !file.endsWith("scripts/verify-phase3.mjs")).map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const sensitiveMarker of ["tripulante_nome_completo", "tripulante_email_pessoal", "tripulante_telefone_pessoal", "tripulante_estado_pagamento_individual"]) {
  check(`marcador privado ausente: ${sensitiveMarker}`, !combined.toLowerCase().includes(sensitiveMarker));
}
check("PDFs provisórios não incluídos", !fs.readdirSync(root).some((name) => /Etapa 4.*provis/i.test(name)));

for (const file of allTextFiles.filter((file) => file.endsWith(".json"))) {
  try { JSON.parse(fs.readFileSync(file, "utf8")); check(`JSON válido ${path.relative(root, file)}`, true); }
  catch (error) { check(`JSON válido ${path.relative(root, file)}`, false, String(error)); }
}

const versions = [];
for (const relative of ["package.json", ...fs.readdirSync(path.join(root, "packages")).map((name) => `packages/${name}/package.json`), "apps/web/package.json"]) {
  const packageFile = json(relative);
  versions.push([relative, packageFile.version]);
}
const expectedVersion = json("package.json").version;
check("todos os packages usam a versão raiz", versions.every(([, version]) => version === expectedVersion), JSON.stringify(versions));

console.log(JSON.stringify({ checks: checks.length, passed: checks.filter((item) => item.ok).length, failed: failures.length, failures }, null, 2));
if (failures.length) process.exit(1);
