import { buildUserDataExport, prisma } from "@desafio/database";
import { getCurrentSession } from "@/lib/session";
import { getRequestContext } from "@/lib/request-context";
import { rateLimit } from "@/lib/redis";
import { recordSecurityEvent } from "@/lib/security/security-event";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const context = await getRequestContext();
  const limiter = await rateLimit(`privacy-export:${session.user.id}`, 3, 86_400);
  if (!limiter.allowed) {
    await recordSecurityEvent({
      severity: "WARNING",
      eventType: "PRIVACY_EXPORT_RATE_LIMITED",
      actorUserId: session.user.id,
      requestId: context.requestId,
      ipHash: context.ipHash,
      route: "/api/privacy/export",
      method: "GET",
    });
    return Response.json({ error: "Limite diário atingido." }, { status: 429 });
  }

  const payload = await buildUserDataExport(session.user.id);
  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      action: "PERSONAL_DATA_EXPORTED",
      entityType: "User",
      entityId: session.user.id,
      ipAddress: context.ipAddress,
      ipHash: context.ipHash,
      requestId: context.requestId,
      userAgent: context.userAgent,
    },
  });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="desafio-volta-dados-${day}.json"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
