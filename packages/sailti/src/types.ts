export type CanonicalResultEntryStatus =
  | "CLASSIFIED" | "DNF" | "DNS" | "DNC" | "DSQ" | "RET"
  | "OCS" | "BFD" | "UFD" | "SCP" | "RDG";

export type CanonicalResultEntry = {
  externalEntryId: string | null;
  sailNumber: string | null;
  boatNumber: string | null;
  boatName: string | null;
  position: number | null;
  status: CanonicalResultEntryStatus;
  elapsedSeconds: number | null;
  correctedSeconds: number | null;
  penaltyCode: string | null;
  raw: Record<string, unknown>;
};

export type CanonicalStageResult = {
  provider: "SAILTI_API" | "SAILTI_XRR" | "SAILTI_FILE" | "SAILTI_HTML" | "MANUAL";
  format: "JSON" | "CSV" | "XRR_XML" | "MANUAL";
  competitionExternalId?: string | null;
  stageExternalId?: string | null;
  stageNumber?: number | null;
  classCode?: string | null;
  status: "PROVISIONAL" | "OFFICIAL";
  publishedAt?: string | null;
  specialAnswer?: unknown;
  entries: CanonicalResultEntry[];
};

export type BoatMatchCandidate = {
  boatId: string;
  publicName: string;
  boatNumber: string;
  sailNumbers: string[];
  externalIds: string[];
  aliases: string[];
};

export type BoatMatch = {
  boatId: string | null;
  status: "MATCHED" | "AMBIGUOUS" | "UNMATCHED";
  confidence: number;
  reason: string;
  candidates: string[];
};

export type ConnectionResult = { ok: boolean; message: string };

export type ExternalCompetition = {
  externalId: string;
  name: string;
};

export type ExternalStage = {
  externalId: string;
  number: number | null;
  name: string;
};

export type ExternalEntry = CanonicalResultEntry;

export type SourceDocument = {
  filename: string;
  mediaType: string;
  content: string;
};

export interface ResultsProvider {
  testConnection(): Promise<ConnectionResult>;
  parse(source: string): Promise<CanonicalStageResult>;
  fetchCompetition(): Promise<ExternalCompetition>;
  fetchStages(): Promise<ExternalStage[]>;
  fetchEntries(stageExternalId: string): Promise<ExternalEntry[]>;
  fetchResults(stageExternalId: string): Promise<CanonicalStageResult>;
  downloadSource(stageExternalId: string): Promise<SourceDocument>;
}
