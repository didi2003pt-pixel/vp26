import { XMLParser } from "fast-xml-parser";
import type { CanonicalResultEntry, CanonicalStageResult } from "./types";
import { parseDuration } from "./normalization";

function deepFindObjects(value: unknown, keys: Set<string>, output: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) deepFindObjects(item, keys, output);
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ([...keys].some((key) => key in record)) output.push(record);
    for (const child of Object.values(record)) deepFindObjects(child, keys, output);
  }
  return output;
}

function get(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (record[key] != null) return record[key];
  return undefined;
}

export function parseXrr(source: string): CanonicalStageResult {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", trimValues: true });
  const document = parser.parse(source) as Record<string, unknown>;
  const candidateObjects = deepFindObjects(document, new Set([
    "SailNumber", "BoatName", "Rank", "Position", "RaceStatus", "CompetitorID",
  ]));

  const entries: CanonicalResultEntry[] = [];
  for (const record of candidateObjects) {
    const sailNumber = get(record, "SailNumber", "SailNo", "BoatSailNumber");
    const boatName = get(record, "BoatName", "YachtName", "Name");
    const positionValue = get(record, "Rank", "Position", "Place");
    if (sailNumber == null && boatName == null) continue;
    const position = Number(positionValue);
    const rawStatus = String(get(record, "RaceStatus", "Status", "ScoringCode") ?? "CLASSIFIED").toUpperCase();
    const allowed = new Set(["CLASSIFIED", "DNF", "DNS", "DNC", "DSQ", "RET", "OCS", "BFD", "UFD", "SCP", "RDG"]);
    const status = allowed.has(rawStatus) ? rawStatus : Number.isFinite(position) ? "CLASSIFIED" : "DNC";
    entries.push({
      externalEntryId: String(get(record, "CompetitorID", "EntryID", "ID") ?? "") || null,
      sailNumber: sailNumber == null ? null : String(sailNumber),
      boatNumber: null,
      boatName: boatName == null ? null : String(boatName),
      position: Number.isFinite(position) && position > 0 ? position : null,
      status: status as CanonicalResultEntry["status"],
      elapsedSeconds: parseDuration(get(record, "ElapsedTime", "Elapsed")),
      correctedSeconds: parseDuration(get(record, "CorrectedTime", "Corrected")),
      penaltyCode: status === "CLASSIFIED" ? null : status,
      raw: record,
    });
  }

  const unique = new Map<string, CanonicalResultEntry>();
  for (const entry of entries) {
    const key = `${entry.externalEntryId ?? ""}|${entry.sailNumber ?? ""}|${entry.boatName ?? ""}`;
    if (!unique.has(key)) unique.set(key, entry);
  }
  if (unique.size === 0) throw new Error("Não foram encontrados resultados reconhecíveis no XRR.");
  return { provider: "SAILTI_XRR", format: "XRR_XML", status: "PROVISIONAL", entries: [...unique.values()] };
}
