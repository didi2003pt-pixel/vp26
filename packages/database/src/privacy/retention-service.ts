import { retentionCutoff } from "@desafio/operations";
import { prisma } from "../client";

export type RetentionPolicy = {
  sessionDays: number;
  tokenDays: number;
  emailOutboxDays: number;
  notificationDays: number;
  securityEventDays: number;
  auditLogDays: number;
};

export async function runRetention(policy: RetentionPolicy, now = new Date()) {
  const run = await prisma.retentionRun.create({
    data: { status: "RUNNING", policy },
  });

  try {
    const summary = await prisma.$transaction(async (tx) => {
      const expiredSessions = await tx.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            {
              revokedAt: { lt: retentionCutoff(now, policy.sessionDays) },
            },
          ],
        },
      });
      const verificationTokens = await tx.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { usedAt: { lt: retentionCutoff(now, policy.tokenDays) } },
          ],
        },
      });
      const passwordTokens = await tx.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { usedAt: { lt: retentionCutoff(now, policy.tokenDays) } },
          ],
        },
      });
      const emailOutbox = await tx.emailOutbox.deleteMany({
        where: {
          status: { in: ["SENT", "FAILED", "CANCELLED"] },
          updatedAt: { lt: retentionCutoff(now, policy.emailOutboxDays) },
        },
      });
      const notifications = await tx.notification.deleteMany({
        where: {
          status: { in: ["READ", "SENT", "FAILED", "CANCELLED"] },
          createdAt: { lt: retentionCutoff(now, policy.notificationDays) },
        },
      });
      const securityEvents = await tx.securityEvent.deleteMany({
        where: { createdAt: { lt: retentionCutoff(now, policy.securityEventDays) } },
      });
      const auditLogs = await tx.auditLog.deleteMany({
        where: { createdAt: { lt: retentionCutoff(now, policy.auditLogDays) } },
      });

      return {
        expiredSessions: expiredSessions.count,
        verificationTokens: verificationTokens.count,
        passwordTokens: passwordTokens.count,
        emailOutbox: emailOutbox.count,
        notifications: notifications.count,
        securityEvents: securityEvents.count,
        auditLogs: auditLogs.count,
      };
    });

    await prisma.retentionRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        summary,
        finishedAt: new Date(),
      },
    });
    return { runId: run.id, summary };
  } catch (error) {
    await prisma.retentionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "unknown",
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}
