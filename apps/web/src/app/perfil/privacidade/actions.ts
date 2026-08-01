"use server";

import { revalidatePath } from "next/cache";
import { getEnv } from "@desafio/config";
import { createDataSubjectRequest, prisma } from "@desafio/database";
import { requireUser } from "@/lib/authorization";
import { getRequestContext } from "@/lib/request-context";
import { toAuditJson } from "@/lib/audit";

export async function requestAccessAction(): Promise<void> {
  const user = await requireUser();
  const env = getEnv();
  const context = await getRequestContext();
  const request = await createDataSubjectRequest({
    userId: user.id,
    email: user.email,
    type: "ACCESS",
    dueDays: env.DATA_SUBJECT_REQUEST_DAYS,
    metadata: { channel: "privacy_center", requestId: context.requestId },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "DATA_ACCESS_REQUESTED",
      entityType: "DataSubjectRequest",
      entityId: request.id,
      ipAddress: context.ipAddress,
      ipHash: context.ipHash,
      requestId: context.requestId,
      userAgent: context.userAgent,
    },
  });
  revalidatePath("/perfil/privacidade");
}

export async function requestErasureAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "APAGAR") throw new Error("Confirmação inválida.");

  const env = getEnv();
  const context = await getRequestContext();
  const request = await createDataSubjectRequest({
    userId: user.id,
    email: user.email,
    type: "ERASURE",
    dueDays: env.DATA_SUBJECT_REQUEST_DAYS,
    metadata: {
      channel: "privacy_center",
      requestedGraceDays: env.ACCOUNT_DELETION_GRACE_DAYS,
      requestId: context.requestId,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "ACCOUNT_ERASURE_REQUESTED",
      entityType: "DataSubjectRequest",
      entityId: request.id,
      metadata: toAuditJson({ graceDays: env.ACCOUNT_DELETION_GRACE_DAYS }),
      ipAddress: context.ipAddress,
      ipHash: context.ipHash,
      requestId: context.requestId,
      userAgent: context.userAgent,
    },
  });
  revalidatePath("/perfil/privacidade");
}

export async function updateMarketingConsentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const granted = formData.get("granted") === "true";
  const env = getEnv();
  const context = await getRequestContext();
  await prisma.consent.create({
    data: {
      userId: user.id,
      type: "MARKETING_EMAIL",
      version: env.PRIVACY_VERSION,
      granted,
      ...context,
    },
  });
  revalidatePath("/perfil/privacidade");
}
