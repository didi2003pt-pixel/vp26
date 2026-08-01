"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, prisma } from "@desafio/database";
import { requireRole } from "@/lib/authorization";
import { getRequestContext } from "@/lib/request-context";

const schema = z.object({
  WINNER_EXACT: z.coerce.number().int().min(0).max(1000),
  PODIUM_EXACT_SECOND: z.coerce.number().int().min(0).max(1000),
  PODIUM_EXACT_THIRD: z.coerce.number().int().min(0).max(1000),
  PODIUM_WRONG_POSITION: z.coerce.number().int().min(0).max(1000),
  SURPRISE_TOP_FIVE: z.coerce.number().int().min(0).max(1000),
  SPECIAL_QUESTION_CORRECT: z.coerce.number().int().min(0).max(1000),
  ALL_ELIGIBLE_STAGES_BONUS: z.coerce.number().int().min(0).max(5000),
});

export async function createScoringRuleVersionAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN", "SUPERADMIN");
  const values = schema.parse(Object.fromEntries(formData));
  const current = await prisma.scoringRuleSet.findFirst({ where: { code: "MVP_2026" }, orderBy: { version: "desc" } });
  await prisma.$transaction(async (tx) => {
    await tx.scoringRuleSet.updateMany({ where: { code: "MVP_2026", active: true }, data: { active: false, validUntil: new Date() } });
    const next = await tx.scoringRuleSet.create({
      data: {
        code: "MVP_2026",
        version: (current?.version ?? 0) + 1,
        name: `Pontuação MVP 2026 · versão ${(current?.version ?? 0) + 1}`,
        active: true,
        validFrom: new Date(),
        rules: { create: Object.entries(values).map(([code, points]) => ({ code, points, active: true })) },
      },
    });
    await tx.predictionMarket.updateMany({
      where: { status: "DRAFT", predictions: { none: {} } },
      data: { scoringRuleSetId: next.id },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "SCORING_RULE_SET_VERSION_CREATED",
        entityType: "ScoringRuleSet",
        entityId: next.id,
        after: values as Prisma.InputJsonValue,
        metadata: await getRequestContext(),
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath("/admin/pontuacao");
}
