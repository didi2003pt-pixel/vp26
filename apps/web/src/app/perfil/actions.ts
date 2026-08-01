"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@desafio/database";
import { requireUser } from "@/lib/authorization";
import { toAuditJson } from "@/lib/audit";
import { getRequestContext } from "@/lib/request-context";

export type ProfileActionState = {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
};

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nickname: z.string().trim().min(3).max(40).regex(/^[\p{L}\p{N}._-]+$/u, "Usa apenas letras, números, ponto, hífen ou underscore."),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  cityId: z.string().uuid().or(z.literal("")),
});

export async function updateProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Revê os campos assinalados.",
      fields: Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages?.[0] ?? "Campo inválido."])),
    };
  }

  const duplicate = await prisma.profile.findFirst({
    where: { nickname: parsed.data.nickname, userId: { not: user.id } },
    select: { id: true },
  });
  if (duplicate) return { ok: false, message: "Esse nickname já está a ser utilizado.", fields: { nickname: "Escolhe outro nickname." } };

  const context = await getRequestContext();
  const before = await prisma.profile.findUnique({ where: { userId: user.id } });
  const after = await prisma.profile.update({
    where: { userId: user.id },
    data: {
      name: parsed.data.name,
      nickname: parsed.data.nickname,
      countryCode: parsed.data.countryCode,
      cityId: parsed.data.cityId || null,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "PROFILE_UPDATED",
      entityType: "Profile",
      entityId: after.id,
      before: toAuditJson(before),
      after: toAuditJson(after),
      metadata: context,
    },
  });
  revalidatePath("/perfil");
  return { ok: true, message: "Perfil atualizado." };
}
