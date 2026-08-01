import type { CanonicalResultEntry, CanonicalStageResult } from "./types";
import { parseDuration } from "./normalization";

export function parseCsvRows(source: string): string[][] {
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(value.trim()); value = ""; }
    else if (char === "\n") { row.push(value.trim()); rows.push(row); row = []; value = ""; }
    else if (char !== "\r") value += char;
  }
  if (value.length || row.length) { row.push(value.trim()); rows.push(row); }
  return rows.filter((item) => item.some(Boolean));
}

function pick(record: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) if (record[key] != null && record[key] !== "") return record[key] ?? null;
  return null;
}

export function parseCanonicalCsv(source: string): CanonicalStageResult {
  const rows = parseCsvRows(source);
  if (rows.length < 2) throw new Error("O CSV não contém linhas de resultados.");
  const headers = rows[0]!.map((header) => header.trim().toLowerCase().replace(/\s+/g, "_"));
  const entries: CanonicalResultEntry[] = rows.slice(1).map((values, index) => {
    const record = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    const rawStatus = (pick(record, "status", "estado", "code") ?? "CLASSIFIED").toUpperCase();
    const positionRaw = pick(record, "position", "posicao", "posição", "rank");
    const position = positionRaw && /^\d+$/.test(positionRaw) ? Number(positionRaw) : null;
    const status = rawStatus === "OK" || rawStatus === "CLASSIFIED" ? "CLASSIFIED" : rawStatus;
    const allowed = new Set(["CLASSIFIED", "DNF", "DNS", "DNC", "DSQ", "RET", "OCS", "BFD", "UFD", "SCP", "RDG"]);
    if (!allowed.has(status)) throw new Error(`Estado inválido na linha ${index + 2}: ${status}.`);
    return {
      externalEntryId: pick(record, "external_entry_id", "entry_id", "id"),
      sailNumber: pick(record, "sail_number", "numero_vela", "n_vela", "vela"),
      boatNumber: pick(record, "boat_number", "numero_barco", "n_barco"),
      boatName: pick(record, "boat_name", "nome_embarcacao", "embarcacao", "barco"),
      position,
      status: status as CanonicalResultEntry["status"],
      elapsedSeconds: parseDuration(pick(record, "elapsed", "elapsed_time", "tempo_real")),
      correctedSeconds: parseDuration(pick(record, "corrected", "corrected_time", "tempo_corrigido")),
      penaltyCode: pick(record, "penalty", "penalizacao", "penalização"),
      raw: record,
    };
  });
  return { provider: "SAILTI_FILE", format: "CSV", status: "PROVISIONAL", entries };
}
