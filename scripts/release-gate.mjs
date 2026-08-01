import fs from "node:fs";

const blockers = [];
const warnings = [];

if (!fs.existsSync("package-lock.json")) {
  blockers.push("package-lock.json em falta: gerar com o registo npm oficial e executar npm ci.");
}
if (!fs.existsSync(".env.production")) {
  blockers.push(".env.production em falta.");
} else {
  const productionEnv = fs.readFileSync(".env.production", "utf8");
  for (const marker of ["example.pt", "your-domain.pt", "GENERATE_", "replace-with-"]) {
    if (productionEnv.includes(marker)) blockers.push(`.env.production contém marcador não substituído: ${marker}`);
  }
  if (!/^APP_URL=https:\/\//m.test(productionEnv)) blockers.push("APP_URL de produção não usa HTTPS.");
  for (const required of [
    "AUTH_PEPPER",
    "IP_HASH_PEPPER",
    "METRICS_TOKEN",
    "CRON_SECRET",
    "RESULTS_CRON_SECRET",
    "RETENTION_CRON_SECRET",
    "SECURITY_CONTACT_EMAIL",
    "PRIVACY_CONTACT_EMAIL",
  ]) {
    if (!new RegExp(`^${required}=.+$`, "m").test(productionEnv)) {
      blockers.push(`variável de produção em falta: ${required}`);
    }
  }
}
const compose = fs.readFileSync("compose.production.yml", "utf8");
if (/:latest\b/.test(compose)) blockers.push("compose.production.yml contém uma tag latest.");
if (!compose.includes("read_only: true")) blockers.push("contentor web não está read-only.");
if (!compose.includes('cap_drop: ["ALL"]')) blockers.push("capabilities do contentor web não foram removidas.");

const envExample = fs.readFileSync(".env.example", "utf8");
if (!envExample.includes("BACKUP_ENCRYPTION_RECIPIENT")) blockers.push("configuração de cifragem de backup em falta.");
if (!envExample.includes("IP_HASH_PEPPER")) blockers.push("pepper de hash de IP em falta.");

warnings.push("A política de privacidade e os termos continuam sujeitos a aprovação jurídica.");
warnings.push("A API/exportação Sailti real continua por validar.");
warnings.push("É obrigatório executar um restauro de backup e um ensaio de carga antes do lançamento.");

console.log(JSON.stringify({
  releaseReady: blockers.length === 0,
  blockers,
  warnings,
}, null, 2));
if (blockers.length) process.exit(1);
