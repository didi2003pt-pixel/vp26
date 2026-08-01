"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@desafio/database";
import { requireRole } from "@/lib/authorization";
import { toAuditJson } from "@/lib/audit";
import { parseLisbonDateTimeLocal } from "@/lib/game/format";
import { getRequestContext } from "@/lib/request-context";

export type AdminActionState = { ok: boolean; message?: string };

const stageStatusValues = [
  "DRAFT", "SCHEDULED", "PREDICTIONS_OPEN", "PREDICTIONS_CLOSED", "IN_PROGRESS",
  "PROVISIONAL_RESULTS", "OFFICIAL_RESULTS", "POSTPONED", "CANCELLED", "ARCHIVED",
] as const;
const marketStatusValues = ["DRAFT", "OPEN", "CLOSED", "CANCELLED", "ARCHIVED"] as const;
const questionTypeValues = [
  "SINGLE_CHOICE", "TRUE_FALSE", "EXACT_NUMBER", "NUMERIC_RANGE", "TIME_DIFFERENCE", "TIME_RANGE",
] as const;

const stageSchema = z.object({
  stageId: z.string().uuid(),
  status: z.enum(stageStatusValues),
  scheduledStartAt: z.string(),
});

const marketSchema = z.object({
  marketId: z.string().uuid(),
  status: z.enum(marketStatusValues),
  opensAt: z.string(),
  closesAt: z.string(),
  allowSurpriseInPodium: z.string().optional(),
});

export async function updateStageAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const parsed = stageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Dados da etapa inválidos." };

  try {
    const scheduledStartAt = parseLisbonDateTimeLocal(parsed.data.scheduledStartAt);
    const before = await prisma.stage.findUniqueOrThrow({ where: { id: parsed.data.stageId } });
    const after = await prisma.stage.update({
      where: { id: parsed.data.stageId },
      data: { status: parsed.data.status, scheduledStartAt },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "STAGE_UPDATED",
        entityType: "Stage",
        entityId: after.id,
        before: toAuditJson(before),
        after: toAuditJson(after),
        metadata: await getRequestContext(),
      },
    });
    revalidatePath(`/admin/etapas/${after.id}`);
    revalidatePath(`/etapas/${after.slug}`);
    return { ok: true, message: "Etapa atualizada." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível atualizar a etapa." };
  }
}

export async function updateMarketAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const parsed = marketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Dados do mercado inválidos." };

  try {
    const opensAt = parseLisbonDateTimeLocal(parsed.data.opensAt);
    const closesAt = parseLisbonDateTimeLocal(parsed.data.closesAt);
    if (parsed.data.status === "OPEN" && (!opensAt || !closesAt)) {
      return { ok: false, message: "Um mercado aberto precisa de data de abertura e fecho." };
    }
    if (parsed.data.status === "OPEN" && closesAt && closesAt <= new Date()) {
      return { ok: false, message: "Não é possível abrir um mercado cujo prazo já terminou." };
    }
    if (opensAt && closesAt && opensAt >= closesAt) {
      return { ok: false, message: "O fecho tem de ser posterior à abertura." };
    }

    const before = await prisma.predictionMarket.findUniqueOrThrow({
      where: { id: parsed.data.marketId },
      include: { stage: true, _count: { select: { predictions: true } } },
    });
    if (before._count.predictions > 0) {
      const sameOpen = before.opensAt?.getTime() === opensAt?.getTime();
      const sameSurpriseRule = before.allowSurpriseInPodium === (parsed.data.allowSurpriseInPodium === "on");
      const removesDeadline = Boolean(before.closesAt && !closesAt);
      const shortensDeadline = Boolean(before.closesAt && closesAt && closesAt < before.closesAt);
      if (!sameOpen || !sameSurpriseRule || removesDeadline || shortensDeadline) {
        return { ok: false, message: "Depois da primeira previsão não é permitido alterar a abertura, a regra da surpresa ou encurtar o prazo." };
      }
    }
    const after = await prisma.$transaction(async (tx) => {
      const updated = await tx.predictionMarket.update({
        where: { id: parsed.data.marketId },
        data: {
          status: parsed.data.status,
          opensAt,
          closesAt,
          allowSurpriseInPodium: parsed.data.allowSurpriseInPodium === "on",
        },
      });

      const markets = await tx.predictionMarket.findMany({
        where: { stageId: before.stageId },
        select: { opensAt: true, closesAt: true },
      });
      const openings = markets.flatMap(({ opensAt }) => opensAt ? [opensAt] : []);
      const closings = markets.flatMap(({ closesAt }) => closesAt ? [closesAt] : []);
      await tx.stage.update({
        where: { id: before.stageId },
        data: {
          predictionsOpenAt: openings.length ? new Date(Math.min(...openings.map(Number))) : null,
          predictionsCloseAt: closings.length ? new Date(Math.max(...closings.map(Number))) : null,
        },
      });
      return updated;
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "PREDICTION_MARKET_UPDATED",
        entityType: "PredictionMarket",
        entityId: after.id,
        before: toAuditJson(before),
        after: toAuditJson(after),
        metadata: await getRequestContext(),
      },
    });
    revalidatePath(`/admin/etapas/${before.stageId}`);
    revalidatePath(`/etapas/${before.stage.slug}`);
    return { ok: true, message: "Mercado atualizado." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível atualizar o mercado." };
  }
}

export async function updateSurpriseEligibilityAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  try {
    const marketId = z.string().uuid().parse(formData.get("marketId"));
    const selected = new Set(formData.getAll("surpriseBoatId").map(String));
    const market = await prisma.predictionMarket.findUniqueOrThrow({
      where: { id: marketId },
      include: { stage: true, class: true, _count: { select: { predictions: true } } },
    });
    if (market._count.predictions > 0) {
      return { ok: false, message: "A elegibilidade de surpresa fica bloqueada depois da primeira previsão." };
    }
    const eligible = await prisma.stageBoat.findMany({
      where: {
        stageId: market.stageId,
        eligibleForPrediction: true,
        boat: { OR: [{ classId: market.classId }, { class: { parentId: market.classId } }] },
      },
      include: { boat: true },
    });
    const validIds = new Set(eligible.map(({ boatId }) => boatId));
    for (const id of selected) {
      if (!validIds.has(id)) return { ok: false, message: "Foi selecionada uma embarcação inválida." };
    }

    await prisma.$transaction(async (tx) => {
      for (const item of eligible) {
        await tx.stageBoat.update({
          where: { id: item.id },
          data: { surpriseEligible: selected.has(item.boatId) },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "SURPRISE_ELIGIBILITY_UPDATED",
          entityType: "PredictionMarket",
          entityId: market.id,
          after: { selectedBoatIds: [...selected] },
          metadata: await getRequestContext(),
        },
      });
    });
    revalidatePath(`/admin/etapas/${market.stageId}`);
    revalidatePath(`/etapas/${market.stage.slug}`);
    return { ok: true, message: "Elegibilidade de surpresa atualizada." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível atualizar a elegibilidade." };
  }
}

const questionSchema = z.object({
  marketId: z.string().uuid(),
  type: z.enum(questionTypeValues),
  prompt: z.string().trim().min(5).max(500),
  helpText: z.string().trim().max(500),
  points: z.coerce.number().int().min(0).max(500),
  active: z.string().optional(),
  options: z.string().max(5000),
});

function parseOptions(raw: string): Array<{ value: string; label: string; sortOrder: number }> {
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const separator = line.indexOf("|");
    const value = (separator >= 0 ? line.slice(0, separator) : line).trim();
    const label = (separator >= 0 ? line.slice(separator + 1) : line).trim();
    if (!value || !label) throw new Error(`Opção inválida na linha ${index + 1}. Usa valor|texto.`);
    return { value, label, sortOrder: index };
  });
}

export async function upsertSpecialQuestionAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const user = await requireRole("ADMIN", "SUPERADMIN", "RESULTS_MANAGER");
  const parsed = questionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Configuração da pergunta inválida." };

  try {
    const options = parseOptions(parsed.data.options);
    const requiresOptions = ["SINGLE_CHOICE", "NUMERIC_RANGE", "TIME_RANGE"].includes(parsed.data.type);
    if (parsed.data.active === "on" && requiresOptions && options.length < 2) {
      return { ok: false, message: "Uma pergunta por opções precisa de pelo menos duas opções." };
    }

    const market = await prisma.predictionMarket.findUniqueOrThrow({
      where: { id: parsed.data.marketId },
      include: { stage: true, _count: { select: { predictions: true } } },
    });
    if (market._count.predictions > 0) {
      return { ok: false, message: "A pergunta fica bloqueada depois da primeira previsão." };
    }
    const before = await prisma.specialQuestion.findUnique({ where: { marketId: market.id }, include: { options: true } });
    const after = await prisma.$transaction(async (tx) => {
      const question = await tx.specialQuestion.upsert({
        where: { marketId: market.id },
        update: {
          type: parsed.data.type,
          prompt: parsed.data.prompt,
          helpText: parsed.data.helpText || null,
          points: parsed.data.points,
          active: parsed.data.active === "on",
        },
        create: {
          marketId: market.id,
          type: parsed.data.type,
          prompt: parsed.data.prompt,
          helpText: parsed.data.helpText || null,
          points: parsed.data.points,
          active: parsed.data.active === "on",
        },
      });
      await tx.specialQuestionOption.deleteMany({ where: { questionId: question.id } });
      if (options.length) {
        await tx.specialQuestionOption.createMany({
          data: options.map((option) => ({ ...option, questionId: question.id })),
        });
      }
      return tx.specialQuestion.findUniqueOrThrow({ where: { id: question.id }, include: { options: true } });
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "SPECIAL_QUESTION_UPSERTED",
        entityType: "SpecialQuestion",
        entityId: after.id,
        ...(before ? { before: toAuditJson(before) } : {}),
        after: toAuditJson(after),
        metadata: await getRequestContext(),
      },
    });
    revalidatePath(`/admin/etapas/${market.stageId}`);
    revalidatePath(`/etapas/${market.stage.slug}`);
    return { ok: true, message: "Pergunta especial atualizada." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível atualizar a pergunta." };
  }
}
