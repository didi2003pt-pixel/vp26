"use server";

import { revalidatePath } from "next/cache";
import { anonymizeUserForErasure } from "@desafio/database";
import { requireRole } from "@/lib/authorization";

export async function anonymizeRequestAction(formData: FormData): Promise<void> {
  const admin = await requireRole("SUPERADMIN");
  const requestId = String(formData.get("requestId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!requestId || confirmation !== `ANONIMIZAR:${requestId}`) {
    throw new Error("Confirmação inválida.");
  }
  await anonymizeUserForErasure({ requestId, handledById: admin.id });
  revalidatePath("/admin/privacidade");
}
