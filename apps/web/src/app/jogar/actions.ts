"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildPredictionSnapshot,
  normalizeSpecialAnswer,
  resolveMarketAvailability,
  validatePredictionSelection,
} from "@desafio/game";
import { Prisma, prisma } from "@desafio/database";
import { requireUser } from "@/lib/authorization";
import { toAuditJson } from "@/lib/audit";
import { getFeatureFlags } from "@/lib/game/flags";
import { getRequestContext } from "@/lib/request-context";

export type PredictionActionState = {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
  updatedAt?: string;
};

const predictionSchema = z.object({
  marketId: z.string().uuid(),
  winnerBoatId: z.string().uuid(),
  secondBoatId: z.string().uuid(),
  thirdBoatId: z.string().uuid(),
  surpriseBoatId: z.string().uuid(),
  specialAnswer: z.string().max(200).default(""),
});

function snapshotFromExisting(existing: {
  podium: Array<{ position: number; boatId: string }>;
  surpriseBoatId: string | null;
  specialAnswer: unknown;
}) {
  return {
    podium: existing.podium.map(({ position, boatId }) => ({ position, boatId })),
    surpriseBoatId: existing.surpriseBoatId,
    specialAnswer: existing.specialAnswer,
  };
}

export async function submitPredictionAction(
  _previousState: PredictionActionState,
  formData: FormData,
): Promise<PredictionActionState> {
  const user = await requireUser();
  const flags = await getFeatureFlags("public_game_enabled", "predictions_enabled");
  if (!flags.public_game_enabled || !flags.predictions_enabled) {
    return { ok: false, message: "As previsões ainda não foram abertas pela organização." };
  }

  const parsed = predictionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Revê os campos assinalados.",
      fields: Object.fromEntries(
        Object.entries(flattened).map(([key, messages]) => [key, messages?.[0] ?? "Campo inválido."]),
      ),
    };
  }

  const context = await getRequestContext();
  const now = new Date();

  try {
    const runSubmission = () => prisma.$transaction(async (tx) => {
      const market = await tx.predictionMarket.findUnique({
        where: { id: parsed.data.marketId },
        include: {
          stage: true,
          class: true,
          specialQuestion: {
            include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
          },
        },
      });
      if (!market) throw new Error("Mercado de previsões inexistente.");

      const launchSetting = await tx.systemSetting.findUnique({
        where: { key: "game_launch_stage" },
        select: { value: true },
      });
      const launchValue = launchSetting?.value;
      const launchStage = launchValue && typeof launchValue === "object" && !Array.isArray(launchValue)
        ? (launchValue as { stage?: unknown }).stage
        : null;
      if (typeof launchStage === "number" && market.stage.number < launchStage) {
        throw new Error("Esta etapa é anterior ao lançamento competitivo do jogo.");
      }

      const availability = resolveMarketAvailability({
        marketStatus: market.status,
        stageStatus: market.stage.status,
        opensAt: market.opensAt,
        closesAt: market.closesAt,
        now,
      });
      if (!availability.open) throw new Error(availability.message);

      const stageBoats = await tx.stageBoat.findMany({
        where: {
          stageId: market.stageId,
          eligibleForPrediction: true,
          boat: {
            OR: [
              { classId: market.classId },
              { class: { parentId: market.classId } },
            ],
          },
        },
        select: { boatId: true, surpriseEligible: true },
      });

      const selection = validatePredictionSelection({
        winnerBoatId: parsed.data.winnerBoatId,
        secondBoatId: parsed.data.secondBoatId,
        thirdBoatId: parsed.data.thirdBoatId,
        surpriseBoatId: parsed.data.surpriseBoatId,
        eligibleBoatIds: stageBoats.map(({ boatId }) => boatId),
        surpriseEligibleBoatIds: stageBoats.filter(({ surpriseEligible }) => surpriseEligible).map(({ boatId }) => boatId),
        allowSurpriseInPodium: market.allowSurpriseInPodium,
      });
      if (!selection.valid) {
        return { validationErrors: selection.errors } as const;
      }

      let specialAnswer: unknown = null;
      if (market.specialQuestion?.active) {
        specialAnswer = normalizeSpecialAnswer(
          market.specialQuestion.type,
          parsed.data.specialAnswer,
          market.specialQuestion.options.map(({ value }) => value),
        );
      }

      const afterSnapshot = buildPredictionSnapshot({
        winnerBoatId: parsed.data.winnerBoatId,
        secondBoatId: parsed.data.secondBoatId,
        thirdBoatId: parsed.data.thirdBoatId,
        surpriseBoatId: parsed.data.surpriseBoatId,
        specialAnswer,
      });

      const existing = await tx.prediction.findUnique({
        where: { userId_marketId: { userId: user.id, marketId: market.id } },
        include: { podium: { orderBy: { position: "asc" } } },
      });
      if (existing?.lockedAt || existing?.status === "LOCKED") {
        throw new Error("Esta previsão já está bloqueada.");
      }

      const beforeSnapshot = existing ? snapshotFromExisting(existing) : null;
      const prediction = existing
        ? await tx.prediction.update({
            where: { id: existing.id },
            data: {
              status: "SUBMITTED",
              surpriseBoatId: parsed.data.surpriseBoatId,
              specialAnswer: specialAnswer === null ? Prisma.DbNull : toAuditJson(specialAnswer),
              submittedAt: now,
              lockedAt: null,
            },
          })
        : await tx.prediction.create({
            data: {
              userId: user.id,
              marketId: market.id,
              status: "SUBMITTED",
              surpriseBoatId: parsed.data.surpriseBoatId,
              specialAnswer: specialAnswer === null ? Prisma.DbNull : toAuditJson(specialAnswer),
              submittedAt: now,
            },
          });

      if (existing) {
        await tx.predictionPodium.deleteMany({ where: { predictionId: prediction.id } });
      }
      await tx.predictionPodium.createMany({
        data: afterSnapshot.podium.map(({ position, boatId }) => ({ predictionId: prediction.id, position, boatId })),
      });

      await tx.predictionRevision.create({
        data: {
          predictionId: prediction.id,
          actorUserId: user.id,
          reason: existing ? "USER_UPDATED" : "CREATED",
          ...(beforeSnapshot ? { beforeSnapshot: toAuditJson(beforeSnapshot) } : {}),
          afterSnapshot: toAuditJson(afterSnapshot),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: existing ? "PREDICTION_UPDATED" : "PREDICTION_SUBMITTED",
          entityType: "Prediction",
          entityId: prediction.id,
          ...(beforeSnapshot ? { before: toAuditJson(beforeSnapshot) } : {}),
          after: toAuditJson(afterSnapshot),
          metadata: {
            ...context,
            marketId: market.id,
            stageId: market.stageId,
            classId: market.classId,
          },
        },
      });

      return { predictionId: prediction.id, stageSlug: market.stage.slug, classCode: market.class.code } as const;
    }, { isolationLevel: "Serializable" });

    let outcome: Awaited<ReturnType<typeof runSubmission>> | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        outcome = await runSubmission();
        break;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (attempt === 0 && (code === "P2034" || code === "P2002")) continue;
        throw error;
      }
    }
    if (!outcome) throw new Error("Não foi possível concluir a transação.");

    if ("validationErrors" in outcome) {
      return { ok: false, message: "A previsão contém escolhas inválidas.", fields: outcome.validationErrors };
    }

    revalidatePath(`/jogar/${outcome.stageSlug}/${outcome.classCode.toLowerCase()}`);
    revalidatePath(`/etapas/${outcome.stageSlug}`);
    return { ok: true, message: "Previsão guardada. Podes alterá-la até ao fecho.", updatedAt: now.toISOString() };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível guardar a previsão.",
    };
  }
}
