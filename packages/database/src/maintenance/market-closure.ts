import { prisma } from "../client";

export type MarketClosureResult = {
  closedMarkets: number;
  lockedPredictions: number;
  closedStages: number;
};

export async function closeExpiredMarkets(now = new Date()): Promise<MarketClosureResult> {
  return prisma.$transaction(async (tx) => {
    const expiredMarkets = await tx.predictionMarket.findMany({
      where: { status: "OPEN", closesAt: { lte: now } },
      select: { id: true, stageId: true },
    });

    if (expiredMarkets.length === 0) {
      return { closedMarkets: 0, lockedPredictions: 0, closedStages: 0 };
    }

    const marketIds = expiredMarkets.map(({ id }) => id);
    const stageIds = [...new Set(expiredMarkets.map(({ stageId }) => stageId))];

    const predictionsToLock = await tx.prediction.findMany({
      where: { marketId: { in: marketIds }, status: "SUBMITTED", lockedAt: null },
      include: { podium: { orderBy: { position: "asc" } } },
    });

    for (const prediction of predictionsToLock) {
      const beforeSnapshot = {
        status: prediction.status,
        podium: prediction.podium.map(({ position, boatId }) => ({ position, boatId })),
        surpriseBoatId: prediction.surpriseBoatId,
        specialAnswer: prediction.specialAnswer,
      };
      await tx.predictionRevision.create({
        data: {
          predictionId: prediction.id,
          reason: "SYSTEM_LOCKED",
          beforeSnapshot,
          afterSnapshot: { ...beforeSnapshot, status: "LOCKED", lockedAt: now.toISOString() },
        },
      });
    }

    const marketUpdate = await tx.predictionMarket.updateMany({
      where: { id: { in: marketIds }, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    const predictionUpdate = await tx.prediction.updateMany({
      where: { marketId: { in: marketIds }, status: "SUBMITTED", lockedAt: null },
      data: { status: "LOCKED", lockedAt: now },
    });

    let closedStages = 0;
    for (const stageId of stageIds) {
      const remainingOpen = await tx.predictionMarket.count({
        where: { stageId, status: "OPEN" },
      });
      if (remainingOpen === 0) {
        const updated = await tx.stage.updateMany({
          where: { id: stageId, status: "PREDICTIONS_OPEN" },
          data: { status: "PREDICTIONS_CLOSED" },
        });
        closedStages += updated.count;
      }
    }

    await tx.auditLog.create({
      data: {
        action: "EXPIRED_MARKETS_CLOSED",
        entityType: "PredictionMarket",
        metadata: {
          now: now.toISOString(),
          marketIds,
          closedMarkets: marketUpdate.count,
          lockedPredictions: predictionUpdate.count,
          closedStages,
        },
      },
    });

    return {
      closedMarkets: marketUpdate.count,
      lockedPredictions: predictionUpdate.count,
      closedStages,
    };
  });
}
