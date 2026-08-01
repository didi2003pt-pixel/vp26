import { normalizeIdentifier, normalizeName } from "./normalization";
import type { BoatMatch, BoatMatchCandidate, CanonicalResultEntry } from "./types";

export function matchBoat(entry: CanonicalResultEntry, candidates: BoatMatchCandidate[]): BoatMatch {
  const external = normalizeIdentifier(entry.externalEntryId);
  const sail = normalizeIdentifier(entry.sailNumber);
  const boatNumber = normalizeIdentifier(entry.boatNumber);
  const name = normalizeName(entry.boatName);

  const methods: Array<{ reason: string; confidence: number; ids: string[] }> = [];
  if (external) methods.push({ reason: "identificador externo", confidence: 1, ids: candidates.filter((boat) => boat.externalIds.some((id) => normalizeIdentifier(id) === external)).map((boat) => boat.boatId) });
  if (sail) methods.push({ reason: "número de vela", confidence: 0.98, ids: candidates.filter((boat) => boat.sailNumbers.some((id) => normalizeIdentifier(id) === sail)).map((boat) => boat.boatId) });
  if (boatNumber) methods.push({ reason: "número de barco", confidence: 0.90, ids: candidates.filter((boat) => normalizeIdentifier(boat.boatNumber) === boatNumber).map((boat) => boat.boatId) });
  if (name) methods.push({ reason: "nome ou alias", confidence: 0.80, ids: candidates.filter((boat) => [boat.publicName, ...boat.aliases].some((alias) => normalizeName(alias) === name)).map((boat) => boat.boatId) });

  for (const method of methods) {
    const ids = [...new Set(method.ids)];
    if (ids.length === 1) return { boatId: ids[0]!, status: "MATCHED", confidence: method.confidence, reason: method.reason, candidates: ids };
    if (ids.length > 1) return { boatId: null, status: "AMBIGUOUS", confidence: method.confidence, reason: `${method.reason} ambíguo`, candidates: ids };
  }
  return { boatId: null, status: "UNMATCHED", confidence: 0, reason: "sem correspondência", candidates: [] };
}
