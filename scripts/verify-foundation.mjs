import { readFile, access, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const required = [
  "package.json",
  ".env.example",
  "docker-compose.yml",
  "Dockerfile",
  "apps/web/package.json",
  "packages/database/prisma/schema.prisma",
  "packages/database/prisma/migrations/20260729172500_foundation/migration.sql",
  "packages/database/prisma/seed-data/boats.json",
  "packages/database/prisma/seed-data/stages.json",
];

for (const file of required) await access(join(root, file));

const boats = JSON.parse(await readFile(join(root, "packages/database/prisma/seed-data/boats.json"), "utf8"));
const stages = JSON.parse(await readFile(join(root, "packages/database/prisma/seed-data/stages.json"), "utf8"));
if (boats.length !== 30) throw new Error(`Esperadas 30 embarcações; encontradas ${boats.length}.`);
if (stages.length !== 8) throw new Error(`Esperadas 8 etapas; encontradas ${stages.length}.`);

const numbers = boats.map((boat) => boat.boatNumber);
if (new Set(numbers).size !== numbers.length) throw new Error("Existem números de barco duplicados.");
if (boats.some((boat) => !boat.boatNumber || !boat.publicName || !boat.registrationId)) throw new Error("Existem embarcações sem identificadores obrigatórios.");

const serialized = JSON.stringify(boats);
for (const forbidden of ["crew_name", "tripulante", "telefone", "email pessoal"]) {
  if (serialized.toLowerCase().includes(forbidden)) throw new Error(`Dados privados detetados: ${forbidden}`);
}

const workspaceDirs = await readdir(join(root, "packages"));
console.log(JSON.stringify({ status: "ok", boats: boats.length, stages: stages.length, packages: workspaceDirs.sort() }, null, 2));
