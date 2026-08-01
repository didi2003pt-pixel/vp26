import { createHash } from "node:crypto";
import { matchBoat, SailtiFileProvider, SailtiXrrProvider, type BoatMatchCandidate, type CanonicalStageResult } from "@desafio/sailti";
import { validateOfficialResult } from "@desafio/scoring";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../client";
import { recalculateCurrentTotals } from "./scoring-service";

const PARSER_VERSION = "phase3-1.0.0";
const MAX_IMPORT_BYTES = Number(process.env.RESULT_IMPORT_MAX_BYTES ?? 5_242_880);

type ImportFormat = "JSON" | "CSV" | "XRR_XML";
type ImportProvider = "SAILTI_API" | "SAILTI_XRR" | "SAILTI_FILE" | "SAILTI_HTML" | "MANUAL";

function hashSource(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isRetryableTransaction(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  const maxAttempts = Number(process.env.RESULT_RECALCULATION_MAX_RETRIES ?? 5);
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableTransaction(error) || attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 50));
    }
  }
  throw lastError;
}

async function loadBoatCandidates(stageId: string, classId: string): Promise<BoatMatchCandidate[]> {
  const stageBoats = await prisma.stageBoat.findMany({
    where: {
      stageId,
      boat: { OR: [{ classId }, { class: { parentId: classId } }] },
    },
    include: {
      boat: {
        include: {
          names: true,
          identifiers: true,
          externalIdentifiers: true,
        },
      },
    },
  });
  return stageBoats.map(({ boat }) => ({
    boatId: boat.id,
    publicName: boat.publicName,
    boatNumber: boat.boatNumber,
    sailNumbers: boat.identifiers.filter(({ type }) => type === "SAIL_NUMBER").map(({ value }) => value),
    externalIds: boat.externalIdentifiers.map(({ externalId }) => externalId),
    aliases: boat.names.map(({ name }) => name),
  }));
}

function providerFor(format: ImportFormat, requested: ImportProvider): ImportProvider {
  if (format === "XRR_XML") return "SAILTI_XRR";
  return requested;
}

export async function createResultImport({
  stageId,
  classId,
  format,
  provider = "SAILTI_FILE",
  sourceName,
  sourceUrl,
  source,
  uploadedById,
}: {
  stageId: string;
  classId: string;
  format: ImportFormat;
  provider?: ImportProvider;
  sourceName: string;
  sourceUrl?: string | null;
  source: string;
  uploadedById?: string | null;
}) {
  const sourceSize = Buffer.byteLength(source, "utf8");
  if (sourceSize === 0) throw new Error("O ficheiro está vazio.");
  if (sourceSize > MAX_IMPORT_BYTES) throw new Error("O ficheiro excede o limite de importação.");

  await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });
  await prisma.raceClass.findUniqueOrThrow({ where: { id: classId } });

  const actualProvider = providerFor(format, provider);
  const sourceHash = hashSource(source);
  const duplicate = await prisma.resultImport.findFirst({
    where: { provider: actualProvider, sourceHash, stageId, classId },
  });
  if (duplicate) return duplicate;

  const parsed = format === "XRR_XML"
    ? await new SailtiXrrProvider().parse(source)
    : await new SailtiFileProvider(format).parse(source);
  const canonical: CanonicalStageResult = {
    ...parsed,
    provider: actualProvider,
    format,
  };
  const candidates = await loadBoatCandidates(stageId, classId);

  const matchedRows = canonical.entries.map((entry, index) => {
    const match = matchBoat(entry, candidates);
    const invalid: string[] = [];
    if (entry.status === "CLASSIFIED" && (!entry.position || entry.position < 1)) {
      invalid.push("Uma embarcação classificada precisa de posição positiva.");
    }
    if (entry.status !== "CLASSIFIED" && entry.position != null) {
      invalid.push("Uma embarcação não classificada não deve ter posição.");
    }
    const status = invalid.length ? "INVALID" : match.status;
    return {
      rowNumber: index + 1,
      status,
      raw: toJson(entry.raw),
      normalized: toJson(entry),
      boatId: match.boatId,
      matchConfidence: match.confidence,
      matchReason: match.reason,
      errors: invalid.length ? toJson(invalid) : Prisma.JsonNull,
    } as const;
  });

  const allMatched = matchedRows.every(({ status }) => status === "MATCHED");
  return prisma.resultImport.create({
    data: {
      provider: actualProvider,
      format,
      status: allMatched ? "READY" : "NEEDS_REVIEW",
      stageId,
      classId,
      sourceName,
      sourceUrl,
      sourceHash,
      sourceSize,
      rawPayload: source,
      parsedPayload: toJson(canonical),
      parserVersion: PARSER_VERSION,
      uploadedById,
      rows: { create: matchedRows },
    },
    include: { rows: { orderBy: { rowNumber: "asc" } }, stage: true, class: true },
  });
}

async function refreshImportStatus(importId: string) {
  const rows = await prisma.resultImportRow.findMany({ where: { importId } });
  const ready = rows.length > 0 && rows.every(({ status, boatId }) => status === "IGNORED" || (status === "MATCHED" && Boolean(boatId)));
  return prisma.resultImport.update({
    where: { id: importId },
    data: { status: ready ? "READY" : "NEEDS_REVIEW" },
  });
}

export async function resolveImportRow({
  rowId,
  boatId,
  ignored = false,
}: {
  rowId: string;
  boatId?: string | null;
  ignored?: boolean;
}) {
  const row = await prisma.resultImportRow.findUniqueOrThrow({
    where: { id: rowId },
    include: { import: { select: { stageId: true, classId: true, status: true } } },
  });
  if (row.import.status === "CONFIRMED") throw new Error("Uma importação confirmada já não pode ser alterada.");
  if (!row.import.stageId || !row.import.classId) throw new Error("A importação não tem etapa e classe associadas.");
  if (ignored) {
    await prisma.resultImportRow.update({
      where: { id: rowId },
      data: { status: "IGNORED", boatId: null, matchConfidence: 1, matchReason: "Ignorado manualmente", errors: Prisma.JsonNull },
    });
  } else {
    if (!boatId) throw new Error("Seleciona uma embarcação.");
    const eligible = await prisma.stageBoat.findFirst({
      where: {
        stageId: row.import.stageId,
        boatId,
        boat: { OR: [{ classId: row.import.classId }, { class: { parentId: row.import.classId } }] },
      },
      select: { boatId: true },
    });
    if (!eligible) throw new Error("A embarcação selecionada não é elegível para esta etapa e classe.");
    await prisma.resultImportRow.update({
      where: { id: rowId },
      data: { status: "MATCHED", boatId, matchConfidence: 1, matchReason: "Correspondência manual", errors: Prisma.JsonNull },
    });
  }
  return refreshImportStatus(row.importId);
}

type NormalizedImportEntry = {
  externalEntryId?: string | null;
  position?: number | null;
  status: string;
  elapsedSeconds?: number | null;
  correctedSeconds?: number | null;
  penaltyCode?: string | null;
  raw?: unknown;
};

function canonicalEntry(value: Prisma.JsonValue | null): NormalizedImportEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Linha normalizada inválida.");
  return value as NormalizedImportEntry;
}

export async function setResultImportSpecialAnswer({
  importId,
  specialAnswer,
  actorUserId,
}: {
  importId: string;
  specialAnswer: unknown;
  actorUserId?: string | null;
}) {
  const current = await prisma.resultImport.findUniqueOrThrow({
    where: { id: importId },
    select: { status: true, parsedPayload: true },
  });
  if (current.status === "CONFIRMED") throw new Error("Uma importação confirmada já não pode ser alterada.");
  const parsed = current.parsedPayload && typeof current.parsedPayload === "object" && !Array.isArray(current.parsedPayload)
    ? JSON.parse(JSON.stringify(current.parsedPayload)) as Record<string, Prisma.InputJsonValue>
    : {} as Record<string, Prisma.InputJsonValue>;
  const before = parsed.specialAnswer ?? null;
  parsed.specialAnswer = toJson(specialAnswer);
  const updated = await prisma.resultImport.update({
    where: { id: importId },
    data: { parsedPayload: parsed as Prisma.InputJsonValue },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action: "RESULT_IMPORT_SPECIAL_ANSWER_SET",
      entityType: "ResultImport",
      entityId: importId,
      before: toJson({ specialAnswer: before }),
      after: toJson({ specialAnswer }),
    },
  });
  return updated;
}

export async function confirmResultImport({
  importId,
  confirmedById,
  status,
}: {
  importId: string;
  confirmedById?: string | null;
  status?: "PROVISIONAL" | "OFFICIAL";
}) {
  const resultImport = await prisma.resultImport.findUniqueOrThrow({
    where: { id: importId },
    include: { rows: { orderBy: { rowNumber: "asc" } }, stage: true, class: true },
  });
  if (!resultImport.stageId || !resultImport.classId) throw new Error("A importação não tem etapa e classe associadas.");
  if (resultImport.status === "CONFIRMED") {
    return prisma.stageResult.findUniqueOrThrow({ where: { importId } });
  }
  const market = await prisma.predictionMarket.findUniqueOrThrow({
    where: { stageId_classId: { stageId: resultImport.stageId, classId: resultImport.classId } },
    select: { status: true },
  });
  if (market.status !== "CLOSED") {
    throw new Error("Fecha primeiro o mercado de previsões. Um resultado não pode ser confirmado com o mercado aberto ou em rascunho.");
  }
  const activeRows = resultImport.rows.filter(({ status: rowStatus }) => rowStatus !== "IGNORED");
  if (!activeRows.length) throw new Error("A importação não contém linhas ativas.");
  if (activeRows.some(({ status: rowStatus, boatId }) => rowStatus !== "MATCHED" || !boatId)) {
    throw new Error("Todas as linhas precisam de correspondência antes da confirmação.");
  }

  const entries = activeRows.map((row) => {
    const normalized = canonicalEntry(row.normalized);
    return {
      boatId: row.boatId!,
      position: normalized.position ?? null,
      status: normalized.status as any,
      elapsedSeconds: normalized.elapsedSeconds ?? null,
      correctedSeconds: normalized.correctedSeconds ?? null,
      penaltyCode: normalized.penaltyCode ?? null,
      externalEntryId: normalized.externalEntryId ?? null,
      raw: toJson(normalized.raw ?? normalized),
    };
  });
  const validationErrors = validateOfficialResult(entries.map(({ boatId, position, status: entryStatus, elapsedSeconds, correctedSeconds }) => ({
    boatId, position, status: entryStatus, elapsedSeconds, correctedSeconds,
  })));
  if (validationErrors.length) throw new Error(validationErrors.join(" "));

  const parsed = resultImport.parsedPayload as { status?: string; publishedAt?: string; specialAnswer?: unknown } | null;
  const resultStatus = status ?? (parsed?.status === "OFFICIAL" ? "OFFICIAL" : "PROVISIONAL");
  const now = new Date();

  const created = await withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const latest = await tx.stageResult.findFirst({
      where: { stageId: resultImport.stageId!, classId: resultImport.classId! },
      orderBy: { version: "desc" },
    });
    const previousCurrent = await tx.stageResult.findFirst({
      where: { stageId: resultImport.stageId!, classId: resultImport.classId!, isCurrent: true },
      select: { id: true },
    });
    if (previousCurrent) {
      await tx.scoreEvent.updateMany({
        where: { calculationRun: { resultId: previousCurrent.id, isCurrent: true } },
        data: { status: "VOID" },
      });
      await tx.userStageScore.updateMany({
        where: { resultId: previousCurrent.id },
        data: { status: "VOID" },
      });
      await tx.rankingSnapshot.updateMany({
        where: { calculationRun: { resultId: previousCurrent.id } },
        data: { status: "SUPERSEDED" },
      });
      await tx.calculationRun.updateMany({
        where: { resultId: previousCurrent.id, isCurrent: true },
        data: { isCurrent: false, status: "SUPERSEDED" },
      });
    }
    await tx.stageResult.updateMany({
      where: { stageId: resultImport.stageId!, classId: resultImport.classId!, isCurrent: true },
      data: { isCurrent: false, status: "SUPERSEDED" },
    });
    const created = await tx.stageResult.create({
      data: {
        stageId: resultImport.stageId!,
        classId: resultImport.classId!,
        importId: resultImport.id,
        version: (latest?.version ?? 0) + 1,
        status: resultStatus,
        isCurrent: true,
        publishedAt: parsed?.publishedAt ? new Date(parsed.publishedAt) : now,
        confirmedAt: now,
        confirmedById,
        sourceHash: resultImport.sourceHash,
        specialAnswer: parsed?.specialAnswer == null ? Prisma.JsonNull : toJson(parsed.specialAnswer),
        entries: { create: entries },
      },
      include: { entries: true, stage: true, class: true },
    });
    await tx.resultImport.update({
      where: { id: resultImport.id },
      data: { status: "CONFIRMED", confirmedAt: now, confirmedById },
    });
    await tx.stage.update({
      where: { id: resultImport.stageId! },
      data: { status: resultStatus === "OFFICIAL" ? "OFFICIAL_RESULTS" : "PROVISIONAL_RESULTS" },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: confirmedById,
        action: "RESULT_IMPORT_CONFIRMED",
        entityType: "StageResult",
        entityId: created.id,
        after: toJson({ importId, version: created.version, status: created.status, entries: created.entries.length }),
      },
    });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 15_000 }));
  await recalculateCurrentTotals(resultImport.classId);
  return created;
}
