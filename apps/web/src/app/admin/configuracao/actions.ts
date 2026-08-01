"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@desafio/database";
import { requireRole } from "@/lib/authorization";
import { toAuditJson } from "@/lib/audit";
import { getRequestContext } from "@/lib/request-context";

export async function toggleFeatureFlagAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN", "SUPERADMIN");
  const key = z.string().min(1).max(100).parse(formData.get("key"));
  const enabled = formData.get("enabled") === "true";
  const before = await prisma.featureFlag.findUnique({ where: { key } });
  if (!before) throw new Error("Feature flag inexistente.");
  const after = await prisma.featureFlag.update({ where: { key }, data: { enabled } });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "FEATURE_FLAG_UPDATED",
      entityType: "FeatureFlag",
      entityId: after.id,
      before: toAuditJson(before),
      after: toAuditJson(after),
      metadata: await getRequestContext(),
    },
  });
  revalidatePath("/admin/configuracao");
  revalidatePath("/");
  revalidatePath("/jogar");
}

export async function updateGameLaunchStageAction(formData: FormData): Promise<void> {
  const user = await requireRole("ADMIN", "SUPERADMIN");
  const raw = String(formData.get("stage") ?? "");
  const stage = raw === "" ? null : z.coerce.number().int().min(1).max(8).parse(raw);
  const before = await prisma.systemSetting.findUnique({ where: { key: "game_launch_stage" } });
  const after = await prisma.systemSetting.upsert({
    where: { key: "game_launch_stage" },
    update: { value: { stage } },
    create: { key: "game_launch_stage", value: { stage }, description: "Etapa a partir da qual o jogo aceita previsões" },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "GAME_LAUNCH_STAGE_UPDATED",
      entityType: "SystemSetting",
      entityId: after.id,
      ...(before ? { before: toAuditJson(before) } : {}),
      after: toAuditJson(after),
      metadata: await getRequestContext(),
    },
  });
  revalidatePath("/admin/configuracao");
  revalidatePath("/jogar");
}
