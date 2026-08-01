import type {
  CanonicalStageResult,
  ConnectionResult,
  ExternalCompetition,
  ExternalEntry,
  ExternalStage,
  ResultsProvider,
  SourceDocument,
} from "./types";
import { parseCanonicalCsv } from "./csv";
import { parseCanonicalJson } from "./json";
import { parseXrr } from "./xrr";

abstract class UnsupportedRemoteProvider implements ResultsProvider {
  abstract testConnection(): Promise<ConnectionResult>;
  abstract parse(source: string): Promise<CanonicalStageResult>;

  async fetchCompetition(): Promise<ExternalCompetition> {
    throw new Error("Este fornecedor não permite consultar a competição remotamente.");
  }
  async fetchStages(): Promise<ExternalStage[]> {
    throw new Error("Este fornecedor não permite consultar etapas remotamente.");
  }
  async fetchEntries(_stageExternalId: string): Promise<ExternalEntry[]> {
    throw new Error("Este fornecedor não permite consultar inscritos remotamente.");
  }
  async fetchResults(_stageExternalId: string): Promise<CanonicalStageResult> {
    throw new Error("Este fornecedor não permite consultar resultados remotamente.");
  }
  async downloadSource(_stageExternalId: string): Promise<SourceDocument> {
    throw new Error("Este fornecedor não permite descarregar a fonte remotamente.");
  }
}

export class SailtiFileProvider extends UnsupportedRemoteProvider {
  constructor(private readonly format: "JSON" | "CSV" | "XRR_XML") { super(); }
  async testConnection(): Promise<ConnectionResult> {
    return { ok: true, message: "Importação de ficheiro disponível." };
  }
  async parse(source: string): Promise<CanonicalStageResult> {
    const normalizedSource = source.replace(/^\uFEFF/, "");
    if (this.format === "JSON") return parseCanonicalJson(normalizedSource);
    if (this.format === "CSV") return parseCanonicalCsv(normalizedSource);
    return parseXrr(normalizedSource);
  }
}

export class SailtiXrrProvider extends UnsupportedRemoteProvider {
  async testConnection(): Promise<ConnectionResult> {
    return { ok: true, message: "Importação XRR/XML disponível." };
  }
  async parse(source: string): Promise<CanonicalStageResult> {
    return parseXrr(source.replace(/^\uFEFF/, ""));
  }
}

export class ManualResultsProvider extends UnsupportedRemoteProvider {
  async testConnection(): Promise<ConnectionResult> {
    return { ok: true, message: "Introdução manual disponível." };
  }
  async parse(source: string): Promise<CanonicalStageResult> {
    return parseCanonicalJson(source.replace(/^\uFEFF/, ""));
  }
}

export class SailtiApiProvider extends UnsupportedRemoteProvider {
  async testConnection(): Promise<ConnectionResult> {
    return { ok: false, message: "API Sailti ainda não configurada ou autorizada." };
  }
  async parse(_source: string): Promise<CanonicalStageResult> {
    throw new Error("API Sailti não configurada.");
  }
}

export class SailtiHtmlProvider extends UnsupportedRemoteProvider {
  async testConnection(): Promise<ConnectionResult> {
    return { ok: false, message: "Leitura HTML desativada até existir autorização formal." };
  }
  async parse(_source: string): Promise<CanonicalStageResult> {
    throw new Error("Leitura HTML não autorizada.");
  }
}
