import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../client";

type RankableEntry = {
  subjectId: string;
  displayName: string;
  points: number;
  rawPoints: number;
  participants: number;
  tie: string;
  metrics: Record<string, unknown> | Prisma.JsonValue;
};

type RankedEntry = RankableEntry & { rank: number };

type SnapshotDefinition = {
  scope: "GENERAL" | "STAGE" | "CITY" | "CLUB";
  stageId: string | null;
  methodology: string;
  entries: RankedEntry[];
};

function rankSorted<T extends RankableEntry>(rows: T[]): Array<T & { rank: number }> {
  return [...rows]
    .sort((a, b) => b.points - a.points || a.tie.localeCompare(b.tie, "pt"))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function createRankingSnapshots({
  classId,
  stageId,
  marketId,
  calculationRunId,
  definitive,
}: {
  classId: string;
  stageId: string;
  marketId: string;
  calculationRunId: string;
  definitive: boolean;
}) {
  const now = new Date();
  const status = definitive ? "DEFINITIVE" : "PROVISIONAL";
  const [totals, stageScores] = await Promise.all([
    prisma.userTotalScore.findMany({
      where: { classId },
      include: { user: { include: { profile: { include: { city: true, club: true } } } } },
    }),
    prisma.userStageScore.findMany({
      where: { marketId },
      include: { user: { include: { profile: true } } },
    }),
  ]);

  const general = rankSorted(totals.map((score): RankableEntry => ({
    subjectId: score.userId,
    displayName: score.user.profile?.nickname ?? "Participante",
    points: score.points,
    rawPoints: score.points,
    participants: 1,
    tie: [
      String(999999 - score.winnerExactCount).padStart(6, "0"),
      String(999999 - score.exactPodiumCount).padStart(6, "0"),
      String(999999 - score.surpriseCorrectCount).padStart(6, "0"),
      String(999999 - score.specialCorrectCount).padStart(6, "0"),
      String(Math.round(Number(score.numericErrorTotal) * 1000)).padStart(12, "0"),
      score.lastPredictionSubmittedAt?.toISOString() ?? "9999-12-31T23:59:59.999Z",
      score.user.profile?.nickname ?? score.userId,
    ].join(":"),
    metrics: {
      stageCount: score.stageCount,
      winnerExactCount: score.winnerExactCount,
      exactPodiumCount: score.exactPodiumCount,
      surpriseCorrectCount: score.surpriseCorrectCount,
      specialCorrectCount: score.specialCorrectCount,
      numericErrorTotal: score.numericErrorTotal.toString(),
      participationBonusCount: score.participationBonusCount,
      lastPredictionSubmittedAt: score.lastPredictionSubmittedAt?.toISOString() ?? null,
    },
  })));

  const stage = rankSorted(stageScores.map((score): RankableEntry => ({
    subjectId: score.userId,
    displayName: score.user.profile?.nickname ?? "Participante",
    points: score.points,
    rawPoints: score.points,
    participants: 1,
    tie: score.user.profile?.nickname ?? score.userId,
    metrics: score.breakdown,
  })));

  function aggregateCommunity(kind: "city" | "club"): RankedEntry[] {
    const groups = new Map<string, { label: string; values: number[] }>();
    for (const score of totals) {
      const entity = kind === "city" ? score.user.profile?.city : score.user.profile?.club;
      if (!entity) continue;
      const current: { label: string; values: number[] } = groups.get(entity.id) ?? { label: entity.name, values: [] };
      current.values.push(score.points);
      groups.set(entity.id, current);
    }
    return rankSorted([...groups.entries()].map(([subjectId, group]): RankableEntry => {
      const top = [...group.values].sort((a, b) => b - a).slice(0, 10);
      const average = top.length ? top.reduce((sum, value) => sum + value, 0) / top.length : 0;
      return {
        subjectId,
        displayName: group.label,
        points: average,
        rawPoints: group.values.reduce((sum, value) => sum + value, 0),
        participants: group.values.length,
        tie: group.label,
        metrics: { methodology: "average_top_10", countedParticipants: top.length },
      };
    }));
  }

  const definitions: SnapshotDefinition[] = [
    { scope: "GENERAL", stageId: null, methodology: "total_points_by_class", entries: general },
    { scope: "STAGE", stageId, methodology: "stage_points_by_class", entries: stage },
    { scope: "CITY", stageId: null, methodology: "average_top_10", entries: aggregateCommunity("city") },
    { scope: "CLUB", stageId: null, methodology: "average_top_10", entries: aggregateCommunity("club") },
  ];

  return prisma.$transaction(async (tx) => {
    const snapshots: Array<{ id: string }> = [];
    for (const definition of definitions) {
      const snapshot = await tx.rankingSnapshot.create({
        data: {
          scope: definition.scope,
          status,
          stageId: definition.stageId,
          classId,
          calculationRunId,
          methodology: definition.methodology,
          generatedAt: now,
          entries: {
            create: definition.entries.map(({ rank, subjectId, displayName, points, rawPoints, participants, metrics }) => ({
              rank,
              subjectId,
              displayName,
              points,
              rawPoints,
              participants,
              metrics: metrics as Prisma.InputJsonValue,
            })),
          },
        },
      });
      snapshots.push(snapshot);
    }
    return snapshots;
  });
}
