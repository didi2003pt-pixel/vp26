import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js";

const source = fs.readFileSync("packages/operations/src/index.ts", "utf8");
const output = ts.transpileModule(source, {
  fileName: "packages/operations/src/index.ts",
  compilerOptions: {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
  },
  reportDiagnostics: true,
});
if (output.diagnostics?.length) {
  throw new Error(output.diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("\n"));
}
const temporary = path.join(os.tmpdir(), `desafio-operations-${process.pid}.mjs`);
fs.writeFileSync(temporary, output.outputText);
const operations = await import(`${pathToFileURL(temporary).href}?v=${Date.now()}`);

const pepper = "phase5-runtime-pepper-value-1234567890";
const redacted = operations.redactSensitive({ password: "secret", ok: true });
const hash = operations.hashIdentifier("test@example.pt", pepper);
const identity = operations.buildAnonymizedIdentity("12345678-1234-1234-1234-1234567890ab");
const dueAt = operations.calculateDueAt(new Date("2026-07-01T00:00:00Z"), 30);
const cutoff = operations.retentionCutoff(new Date("2026-07-31T00:00:00Z"), 30);
const trusted = operations.isTrustedOrigin("https://jogo.example.pt", "https://jogo.example.pt");
const policy = operations.buildContentSecurityPolicy({ nonce: "runtime", production: true });

const assertions = [
  redacted.password === "[REDACTED]",
  hash.length === 64,
  identity.email.endsWith("@invalid.local"),
  dueAt.toISOString() === "2026-07-31T00:00:00.000Z",
  cutoff.toISOString() === "2026-07-01T00:00:00.000Z",
  trusted === true,
  policy.includes("frame-ancestors 'none'"),
];
fs.rmSync(temporary, { force: true });
if (assertions.some((value) => !value)) throw new Error("Phase 5 runtime assertion failed.");
console.log(JSON.stringify({ phase: 5, checks: assertions.length, passed: assertions.length }, null, 2));
