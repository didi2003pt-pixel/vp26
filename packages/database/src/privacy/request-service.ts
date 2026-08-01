import { buildAnonymizedIdentity, calculateDueAt } from "@desafio/operations";
import { prisma } from "../client";

export type RequestType =
  | "ACCESS"
  | "RECTIFICATION"
  | "ERASURE"
  | "RESTRICTION"
  | "PORTABILITY"
  | "OBJECTION";

const OPEN_STATUSES = ["RECEIVED", "IDENTITY_VERIFICATION", "IN_PROGRESS"] as const;

export async function createDataSubjectRequest(input: {
  userId: string;
  email: string;
  type: RequestType;
  dueDays?: number;
  metadata?: Record<string, unknown>;
}) {
  const existing = await prisma.dataSubjectRequest.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      status: { in: [...OPEN_STATUSES] },
    },
    orderBy: { receivedAt: "desc" },
  });
  if (existing) return existing;

  const receivedAt = new Date();
  return prisma.dataSubjectRequest.create({
    data: {
      userId: input.userId,
      requesterEmail: input.email,
      type: input.type,
      status: "IN_PROGRESS",
      receivedAt,
      dueAt: calculateDueAt(receivedAt, input.dueDays ?? 30),
      identityVerifiedAt: receivedAt,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}

export async function anonymizeUserForErasure(input: {
  requestId: string;
  handledById?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const request = await tx.dataSubjectRequest.findUniqueOrThrow({
      where: { id: input.requestId },
    });
    if (request.type !== "ERASURE") throw new Error("O pedido não é de apagamento.");
    if (!request.userId) throw new Error("O pedido já não está associado a uma conta.");
    if (request.status === "COMPLETED") return request;

    const identity = buildAnonymizedIdentity(request.userId, now);
    await tx.session.updateMany({
      where: { userId: request.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.emailVerificationToken.deleteMany({ where: { userId: request.userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: request.userId } });
    await tx.notification.deleteMany({ where: { userId: request.userId } });
    await tx.emailOutbox.deleteMany({ where: { recipient: request.requesterEmail } });
    await tx.communityMembership.deleteMany({ where: { userId: request.userId } });
    await tx.prizeAward.updateMany({
      where: { userId: request.userId },
      data: { deliveryNote: null },
    });

    await tx.profile.update({
      where: { userId: request.userId },
      data: {
        name: identity.name,
        nickname: identity.nickname,
        phone: null,
        avatarKey: null,
        cityId: null,
        clubId: null,
      },
    });
    await tx.user.update({
      where: { id: request.userId },
      data: {
        email: identity.email,
        passwordHash: null,
        status: "DELETED",
        deletedAt: now,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.handledById ?? null,
        action: "USER_ANONYMIZED",
        entityType: "User",
        entityId: request.userId,
        metadata: {
          requestId: request.id,
          strategy: "pseudonymisation_with_competition_records_retained",
        },
      },
    });
    return tx.dataSubjectRequest.update({
      where: { id: request.id },
      data: {
        requesterEmail: identity.email,
        status: "COMPLETED",
        completedAt: now,
        handledById: input.handledById ?? null,
        decision: "ANONYMIZED",
        responseSummary:
          "Identificadores diretos removidos. Registos competitivos foram mantidos sob identidade anonimizada.",
      },
    });
  }, { isolationLevel: "Serializable" });
}
