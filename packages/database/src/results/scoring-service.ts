import { scorePrediction, type ScoringRules } from "@desafio/scoring";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../client";
import { createRankingSnapshots } from "./ranking-service";

function isRetryable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  const max = Number(process.env.RESULT_RECALCULATION_MAX_RETRIES ?? 5);
  let last: unknown;
  for (let attempt = 1; attempt <= max; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      last = error;
      if (!isRetryable(error) || attempt === max) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 40));
    }
  }
  throw last;
}

function rulesFromRows(rows: Array<{ code: string; points: number; active: boolean }>): ScoringRules {
  const values = Object.fromEntries(rows.filter(({ active }) => active).map(({ code, points }) => [code, points]));
  const required = ["WINNER_EXACT", "PODIUM_EXACT_SECOND", "PODIUM_EXACT_THIRD", "PODIUM_WRONG_POSITION", "SURPRISE_TOP_FIVE", "SPECIAL_QUESTION_CORRECT", "ALL_ELIGIBLE_STAGES_BONUS"] as const;
  for (const code of required) if (!Number.isInteger(values[code])) throw new Error(`Regra de pontuação em falta: ${code}.`);
  return values as unknown as ScoringRules;
}

export async function recalculateCurrentTotals(classId: string, now = new Date()) {
  return withSerializableRetry(() => prisma.$transaction(async (tx) => {
    const scores = await tx.userStageScore.findMany({
      where: { market: { classId }, status: { in: ["PROVISIONAL", "DEFINITIVE"] } },
      select: { userId: true, points: true, breakdown: true, predictionSubmittedAt: true },
    });
    const grouped = new Map<string, {
      points: number;
      stageCount: number;
      winner: number;
      exact: number;
      surprise: number;
      special: number;
      error: number;
      bonus: number;
      lastSubmittedAt: Date | null;
    }>();
    for (const score of scores) {
      const current = grouped.get(score.userId) ?? {
        points: 0, stageCount: 0, winner: 0, exact: 0, surprise: 0,
        special: 0, error: 0, bonus: 0, lastSubmittedAt: null,
      };
      const metrics = score.breakdown && typeof score.breakdown === "object" && !Array.isArray(score.breakdown)
        ? score.breakdown as Record<string, unknown>
        : {};
      current.points += score.points;
      current.stageCount += 1;
      current.winner += Number(metrics.winnerExact ?? 0);
      current.exact += Number(metrics.exactPodium ?? 0);
      current.surprise += Number(metrics.surpriseCorrect ?? 0);
      current.special += Number(metrics.specialCorrect ?? 0);
      current.error += Number(metrics.numericError ?? 0);
      current.bonus += Number(metrics.participationBonus ?? 0);
      if (score.predictionSubmittedAt && (!current.lastSubmittedAt || score.predictionSubmittedAt > current.lastSubmittedAt)) {
        current.lastSubmittedAt = score.predictionSubmittedAt;
      }
      grouped.set(score.userId, current);
    }

    const activeUserIds = [...grouped.keys()];
    if (activeUserIds.length) {
      await tx.userTotalScore.deleteMany({ where: { classId, userId: { notIn: activeUserIds } } });
    } else {
      await tx.userTotalScore.deleteMany({ where: { classId } });
    }
    for (const [userId, total] of grouped) {
      await tx.userTotalScore.upsert({
        where: { userId_classId: { userId, classId } },
        update: {
          points: total.points,
          stageCount: total.stageCount,
          winnerExactCount: total.winner,
          exactPodiumCount: total.exact,
          surpriseCorrectCount: total.surprise,
          specialCorrectCount: total.special,
          numericErrorTotal: total.error,
          participationBonusCount: total.bonus,
          lastPredictionSubmittedAt: total.lastSubmittedAt,
          lastCalculatedAt: now,
        },
        create: {
          userId,
          classId,
          points: total.points,
          stageCount: total.stageCount,
          winnerExactCount: total.winner,
          exactPodiumCount: total.exact,
          surpriseCorrectCount: total.surprise,
          specialCorrectCount: total.special,
          numericErrorTotal: total.error,
          participationBonusCount: total.bonus,
          lastPredictionSubmittedAt: total.lastSubmittedAt,
          lastCalculatedAt: now,
        },
      });
    }
    return { users: grouped.size };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 20_000,
  }));
}

export async function calculateResultScores({ resultId, triggeredById }: { resultId: string; triggeredById?: string | null }) {
  const result = await prisma.stageResult.findUniqueOrThrow({
    where: { id: resultId },
    include: {
      entries: true,
      class: true,
      stage: true,
    },
  });
  if (!result.isCurrent || ["SUPERSEDED", "REJECTED"].includes(result.status)) throw new Error("Só é possível calcular o resultado atual.");

  const market = await prisma.predictionMarket.findUniqueOrThrow({
    where: { stageId_classId: { stageId: result.stageId, classId: result.classId } },
    include: {
      predictions: {
        where: { status: { in: ["SUBMITTED", "LOCKED"] } },
        include: { podium: { orderBy: { position: "asc" } } },
      },
      specialQuestion: true,
      scoringRuleSet: { include: { rules: true } },
    },
  });
  const ruleSet = market.scoringRuleSet ?? await prisma.scoringRuleSet.findFirst({
    where: { active: true, classId: result.classId },
    orderBy: { version: "desc" },
    include: { rules: true },
  }) ?? await prisma.scoringRuleSet.findFirst({
    where: { active: true, classId: null },
    orderBy: { version: "desc" },
    include: { rules: true },
  });
  if (!ruleSet) throw new Error("Não existe um conjunto ativo de regras de pontuação.");
  if (!market.scoringRuleSetId) {
    await prisma.predictionMarket.update({
      where: { id: market.id },
      data: { scoringRuleSetId: ruleSet.id },
    });
  }
  const rules = rulesFromRows(ruleSet.rules);
  const specialQuestion = market.specialQuestion && (result.specialAnswer != null || market.specialQuestion.correctAnswer != null) ? {
    type: market.specialQuestion.type,
    correctAnswer: result.specialAnswer ?? market.specialQuestion.correctAnswer,
    tolerance: market.specialQuestion.tolerance,
  } : null;
  const scoreStatus = result.status === "OFFICIAL" ? "DEFINITIVE" : "PROVISIONAL";

  const computed = market.predictions.map((prediction) => scorePrediction({
    prediction: {
      id: prediction.id,
      userId: prediction.userId,
      marketId: prediction.marketId,
      podium: prediction.podium.map(({ position, boatId }) => ({ position: position as 1 | 2 | 3, boatId })),
      surpriseBoatId: prediction.surpriseBoatId,
      specialAnswer: prediction.specialAnswer,
    },
    resultEntries: result.entries.map(({ boatId, position, status, elapsedSeconds, correctedSeconds }) => ({ boatId, position, status, elapsedSeconds, correctedSeconds })),
    rules,
    specialQuestion,
  }));

  const launchSetting = await prisma.systemSetting.findUnique({ where: { key: "game_launch_stage" }, select: { value: true } });
  const launchValue = launchSetting?.value;
  const launchStage = launchValue && typeof launchValue === "object" && !Array.isArray(launchValue)
    ? (launchValue as { stage?: unknown }).stage
    : null;
  if (result.status === "OFFICIAL" && typeof launchStage === "number") {
    const eligibleMarkets = await prisma.predictionMarket.findMany({
      where: {
        classId: result.classId,
        status: { notIn: ["CANCELLED", "ARCHIVED"] },
        stage: { number: { gte: launchStage }, status: { not: "CANCELLED" } },
      },
      include: { stage: true },
      orderBy: { stage: { number: "asc" } },
    });
    const lastEligibleStage = eligibleMarkets.at(-1)?.stage.number;
    const officialResultCount = await prisma.stageResult.count({
      where: {
        classId: result.classId,
        stageId: { in: eligibleMarkets.map(({ stageId }) => stageId) },
        isCurrent: true,
        status: "OFFICIAL",
      },
    });
    if (lastEligibleStage === result.stage.number && officialResultCount === eligibleMarkets.length && eligibleMarkets.length > 0) {
      const userIds = computed.map(({ userId }) => userId);
      const participation = await prisma.prediction.findMany({
        where: {
          userId: { in: userIds },
          marketId: { in: eligibleMarkets.map(({ id }) => id) },
          status: { in: ["SUBMITTED", "LOCKED"] },
        },
        select: { userId: true, marketId: true },
      });
      const marketCountByUser = new Map<string, Set<string>>();
      for (const item of participation) {
        const set = marketCountByUser.get(item.userId) ?? new Set<string>();
        set.add(item.marketId);
        marketCountByUser.set(item.userId, set);
      }
      for (const score of computed) {
        if (marketCountByUser.get(score.userId)?.size === eligibleMarkets.length) {
          score.events.push({
            ruleCode: "ALL_ELIGIBLE_STAGES_BONUS",
            subjectKey: "participation-bonus",
            points: rules.ALL_ELIGIBLE_STAGES_BONUS,
            explanation: "Participou em todas as etapas elegíveis desde o lançamento do jogo.",
            metadata: { launchStage, eligibleMarkets: eligibleMarkets.length },
          });
          score.points += rules.ALL_ELIGIBLE_STAGES_BONUS;
          score.metrics.participationBonus = 1;
        }
      }
    }
  }
  const submittedAtByPrediction = new Map(market.predictions.map(({ id, submittedAt }) => [id, submittedAt]));

  const calculationRun = await withSerializableRetry<{ id: string }>(() => prisma.$transaction(async (tx) => {
    const latest = await tx.calculationRun.findFirst({ where: { resultId }, orderBy: { runNumber: "desc" } });
    await tx.calculationRun.updateMany({ where: { resultId, isCurrent: true }, data: { isCurrent: false, status: "SUPERSEDED" } });
    const run = await tx.calculationRun.create({
      data: {
        resultId,
        ruleSetId: ruleSet.id,
        runNumber: (latest?.runNumber ?? 0) + 1,
        status: "RUNNING",
        isCurrent: false,
        startedAt: new Date(),
        triggeredById,
      },
    });
    for (const score of computed) {
      if (score.events.length) {
        await tx.scoreEvent.createMany({
          data: score.events.map((event) => ({
            calculationRunId: run.id,
            userId: score.userId,
            predictionId: score.predictionId,
            marketId: score.marketId,
            ruleCode: event.ruleCode,
            subjectKey: event.subjectKey,
            points: event.points,
            explanation: event.explanation,
            status: scoreStatus,
            metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
          })),
        });
      }
      await tx.userStageScore.upsert({
        where: { userId_marketId: { userId: score.userId, marketId: market.id } },
        update: {
          resultId, calculationRunId: run.id, points: score.points,
          breakdown: score.metrics as Prisma.InputJsonValue, status: scoreStatus, calculatedAt: new Date(),
          predictionSubmittedAt: submittedAtByPrediction.get(score.predictionId) ?? null,
        },
        create: {
          userId: score.userId, marketId: market.id, resultId, calculationRunId: run.id,
          points: score.points, breakdown: score.metrics as Prisma.InputJsonValue,
          status: scoreStatus, calculatedAt: new Date(),
          predictionSubmittedAt: submittedAtByPrediction.get(score.predictionId) ?? null,
        },
      });
    }
    return tx.calculationRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED", isCurrent: true, finishedAt: new Date(),
        summary: { predictions: computed.length, points: computed.reduce((sum, score) => sum + score.points, 0) },
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 30_000 }));

  await recalculateCurrentTotals(result.classId);
  await createRankingSnapshots({
    classId: result.classId,
    stageId: result.stageId,
    marketId: market.id,
    calculationRunId: calculationRun.id,
    definitive: result.status === "OFFICIAL",
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: triggeredById,
      action: "RESULT_SCORES_CALCULATED",
      entityType: "CalculationRun",
      entityId: calculationRun.id,
      after: { resultId, predictions: computed.length, definitive: result.status === "OFFICIAL" },
    },
  });
  return calculationRun;
}
