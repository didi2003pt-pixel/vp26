"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateResultScores, confirmResultImport, createResultImport, prisma, resolveImportRow, setResultImportSpecialAnswer } from "@desafio/database";
import { requireRole } from "@/lib/authorization";
import { normalizeSpecialAnswer } from "@desafio/game";

export type ResultActionState = {
  ok: boolean;
  message?: string;
  importId?: string;
  resultId?: string;
};

const uploadSchema = z.object({
  stageId: z.string().uuid(),
  classId: z.string().uuid(),
  marketId: z.string().uuid(),
  format: z.enum(["JSON", "CSV", "XRR_XML"]),
});

export async function uploadResultAction(
  _state: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const parsed = uploadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Dados da importação inválidos." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Seleciona um ficheiro." };

  try {
    const resultImport = await createResultImport({
      stageId: parsed.data.stageId,
      classId: parsed.data.classId,
      format: parsed.data.format,
      sourceName: file.name,
      source: await file.text(),
      uploadedById: user.id,
    });
    revalidatePath(`/admin/resultados/${parsed.data.marketId}`);
    revalidatePath(`/admin/importacoes/${resultImport.id}`);
    return {
      ok: true,
      importId: resultImport.id,
      message: resultImport.status === "READY"
        ? "Ficheiro analisado e pronto para confirmação."
        : "Ficheiro analisado. Existem linhas que exigem revisão.",
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível importar o ficheiro." };
  }
}

export async function resolveImportRowAction(formData: FormData): Promise<void> {
  await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const rowId = z.string().uuid().parse(formData.get("rowId"));
  const importId = z.string().uuid().parse(formData.get("importId"));
  const ignored = formData.get("ignored") === "true";
  const boatId = ignored ? null : z.string().uuid().parse(formData.get("boatId"));
  await resolveImportRow({ rowId, boatId, ignored });
  revalidatePath(`/admin/importacoes/${importId}`);
}


export async function setImportSpecialAnswerAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const importId = z.string().uuid().parse(formData.get("importId"));
  const rawAnswer = z.string().trim().min(1).max(500).parse(formData.get("specialAnswer"));
  const resultImport = await prisma.resultImport.findUniqueOrThrow({
    where: { id: importId },
    select: { stageId: true, classId: true, status: true },
  });
  if (resultImport.status === "CONFIRMED") throw new Error("Uma importação confirmada já não pode ser alterada.");
  if (!resultImport.stageId || !resultImport.classId) throw new Error("A importação não tem etapa e classe associadas.");
  const market = await prisma.predictionMarket.findUniqueOrThrow({
    where: { stageId_classId: { stageId: resultImport.stageId, classId: resultImport.classId } },
    include: { specialQuestion: { include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } },
  });
  if (!market.specialQuestion?.active) throw new Error("Este mercado não tem uma pergunta especial ativa.");
  const normalized = normalizeSpecialAnswer(
    market.specialQuestion.type,
    rawAnswer,
    market.specialQuestion.options.map(({ value }) => value),
  );
  await setResultImportSpecialAnswer({ importId, specialAnswer: normalized, actorUserId: user.id });
  revalidatePath(`/admin/importacoes/${importId}`);
}

export async function confirmImportAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const importId = z.string().uuid().parse(formData.get("importId"));
  const marketId = z.string().uuid().parse(formData.get("marketId"));
  const status = z.enum(["PROVISIONAL", "OFFICIAL"]).parse(formData.get("status"));
  const result = await confirmResultImport({ importId, confirmedById: user.id, status });
  revalidatePath(`/admin/importacoes/${importId}`);
  revalidatePath(`/admin/resultados/${marketId}`);
  revalidatePath(`/etapas/${result.stage.slug}/resultados/${result.class.code.toLowerCase()}`);
}

export async function calculateResultAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const resultId = z.string().uuid().parse(formData.get("resultId"));
  const marketId = z.string().uuid().parse(formData.get("marketId"));
  const run = await calculateResultScores({ resultId, triggeredById: user.id });
  revalidatePath(`/admin/resultados/${marketId}`);
  revalidatePath("/classificacoes");
  revalidatePath("/perfil");
  revalidatePath(`/classificacoes/etapa/${String(formData.get("stageSlug"))}/${String(formData.get("classCode")).toLowerCase()}`);
  revalidatePath(`/admin/resultados/${marketId}?run=${run.id}`);
}

const manualSchema = z.object({
  stageId: z.string().uuid(),
  classId: z.string().uuid(),
  marketId: z.string().uuid(),
  rows: z.string().trim().min(3).max(50_000),
  resultStatus: z.enum(["PROVISIONAL", "OFFICIAL"]),
});

export async function createManualResultAction(
  _state: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Dados manuais inválidos." };
  try {
    const entries = parsed.data.rows.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [positionRaw, boatNumberRaw, statusRaw = "CLASSIFIED"] = line.split("|").map((part) => part.trim());
      if (!boatNumberRaw) throw new Error(`Falta o número de barco na linha ${index + 1}.`);
      const status = statusRaw.toUpperCase();
      const allowed = new Set(["CLASSIFIED", "DNF", "DNS", "DNC", "DSQ", "RET", "OCS", "BFD", "UFD", "SCP", "RDG"]);
      if (!allowed.has(status)) throw new Error(`Estado inválido na linha ${index + 1}.`);
      const position = positionRaw ? Number(positionRaw) : null;
      if (status === "CLASSIFIED" && (!Number.isInteger(position) || Number(position) < 1)) throw new Error(`Posição inválida na linha ${index + 1}.`);
      return { boatNumber: boatNumberRaw, position: status === "CLASSIFIED" ? position : null, status, raw: { sourceLine: line } };
    });
    const source = JSON.stringify({
      provider: "MANUAL",
      format: "JSON",
      status: parsed.data.resultStatus,
      entries,
    });
    const resultImport = await createResultImport({
      stageId: parsed.data.stageId,
      classId: parsed.data.classId,
      format: "JSON",
      provider: "MANUAL",
      sourceName: `manual-${new Date().toISOString()}.json`,
      source,
      uploadedById: user.id,
    });
    revalidatePath(`/admin/resultados/${parsed.data.marketId}`);
    return { ok: true, importId: resultImport.id, message: "Resultado manual criado para revisão." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível criar o resultado manual." };
  }
}
