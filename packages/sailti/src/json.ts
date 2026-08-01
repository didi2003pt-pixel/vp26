import type { CanonicalResultEntry, CanonicalStageResult } from "./types";
import { parseDuration } from "./normalization";

const allowedStatuses = new Set(["CLASSIFIED", "DNF", "DNS", "DNC", "DSQ", "RET", "OCS", "BFD", "UFD", "SCP", "RDG"]);

function nullableString(value: unknown): string | null {
  return value == null || String(value).trim() === "" ? null : String(value);
}

function normalizeEntry(value: unknown, index: number): CanonicalResultEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Entrada inválida na posição ${index + 1}.`);
  const record = value as Record<string, unknown>;
  const status = String(record.status ?? "CLASSIFIED").toUpperCase();
  if (!allowedStatuses.has(status)) throw new Error(`Estado inválido na entrada ${index + 1}: ${status}.`);
  const rawPosition = record.position;
  const position = rawPosition == null || rawPosition === "" ? null : Number(rawPosition);
  if (position != null && (!Number.isInteger(position) || position < 1)) throw new Error(`Posição inválida na entrada ${index + 1}.`);
  return {
    externalEntryId: nullableString(record.externalEntryId),
    sailNumber: nullableString(record.sailNumber),
    boatNumber: nullableString(record.boatNumber),
    boatName: nullableString(record.boatName),
    position,
    status: status as CanonicalResultEntry["status"],
    elapsedSeconds: parseDuration(record.elapsedSeconds),
    correctedSeconds: parseDuration(record.correctedSeconds),
    penaltyCode: nullableString(record.penaltyCode),
    raw: record.raw && typeof record.raw === "object" && !Array.isArray(record.raw) ? record.raw as Record<string, unknown> : record,
  };
}

export function parseCanonicalJson(source: string): CanonicalStageResult {
  const parsed = JSON.parse(source) as Partial<CanonicalStageResult>;
  if (!Array.isArray(parsed.entries)) throw new Error("O JSON precisa de um array entries.");
  return {
    provider: parsed.provider ?? "SAILTI_FILE",
    format: "JSON",
    competitionExternalId: parsed.competitionExternalId ?? null,
    stageExternalId: parsed.stageExternalId ?? null,
    stageNumber: parsed.stageNumber ?? null,
    classCode: parsed.classCode ?? null,
    status: parsed.status === "OFFICIAL" ? "OFFICIAL" : "PROVISIONAL",
    publishedAt: parsed.publishedAt ?? null,
    specialAnswer: parsed.specialAnswer,
    entries: parsed.entries.map(normalizeEntry),
  };
}
