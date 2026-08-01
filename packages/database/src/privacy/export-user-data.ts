import { prisma } from "../client";

export async function buildUserDataExport(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      status: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      profile: true,
      roles: { select: { assignedAt: true, role: { select: { code: true, name: true } } } },
      consents: {
        select: { type: true, version: true, granted: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      memberships: {
        select: {
          status: true,
          joinedAt: true,
          leftAt: true,
          community: { select: { type: true, name: true, slug: true } },
        },
      },
      predictions: {
        select: {
          id: true,
          status: true,
          specialAnswer: true,
          submittedAt: true,
          lockedAt: true,
          createdAt: true,
          updatedAt: true,
          surpriseBoat: { select: { boatNumber: true, publicName: true } },
          podium: {
            select: { position: true, boat: { select: { boatNumber: true, publicName: true } } },
            orderBy: { position: "asc" },
          },
          market: {
            select: {
              code: true,
              stage: { select: { number: true, name: true, stageDate: true } },
              class: { select: { code: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      scoreEvents: {
        select: {
          ruleCode: true,
          subjectKey: true,
          points: true,
          explanation: true,
          status: true,
          createdAt: true,
          market: { select: { code: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      stageScores: {
        select: { points: true, breakdown: true, status: true, calculatedAt: true },
        orderBy: { calculatedAt: "asc" },
      },
      totalScores: {
        select: {
          points: true,
          stageCount: true,
          winnerExactCount: true,
          exactPodiumCount: true,
          surpriseCorrectCount: true,
          specialCorrectCount: true,
          class: { select: { code: true, name: true } },
          lastCalculatedAt: true,
        },
      },
      missionCompletions: {
        select: {
          status: true,
          pointsAwarded: true,
          completedAt: true,
          reviewedAt: true,
          mission: { select: { title: true, type: true } },
        },
        orderBy: { completedAt: "asc" },
      },
      notifications: {
        select: {
          channel: true,
          type: true,
          title: true,
          body: true,
          status: true,
          scheduledAt: true,
          sentAt: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      prizeAwards: {
        select: {
          awardedAt: true,
          deliveredAt: true,
          prize: { select: { title: true, description: true } },
        },
      },
      sessions: {
        select: {
          expiresAt: true,
          lastSeenAt: true,
          revokedAt: true,
          createdAt: true,
          userAgent: true,
        },
        orderBy: { createdAt: "asc" },
      },
      dataSubjectRequests: {
        select: {
          type: true,
          status: true,
          receivedAt: true,
          dueAt: true,
          completedAt: true,
          decision: true,
          responseSummary: true,
        },
        orderBy: { receivedAt: "asc" },
      },
    },
  });

  return {
    schemaVersion: "2026-07-30",
    exportedAt: new Date().toISOString(),
    controller: "Federação Portuguesa de Vela / organização a confirmar juridicamente",
    data: user,
    exclusions: [
      "hashes de palavras-passe e tokens",
      "segredos do sistema",
      "notas internas que revelem dados de terceiros",
      "dados técnicos de segurança que prejudiquem a proteção do serviço",
    ],
  };
}
