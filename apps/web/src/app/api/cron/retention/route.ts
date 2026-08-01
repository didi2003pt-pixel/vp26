import { getEnv } from "@desafio/config";
import { runRetention } from "@desafio/database";

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.RETENTION_CRON_SECRET) return Response.json({ error: "disabled" }, { status: 404 });
  if (request.headers.get("authorization") !== `Bearer ${env.RETENTION_CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runRetention({
    sessionDays: env.RETENTION_SESSION_DAYS,
    tokenDays: env.RETENTION_TOKEN_DAYS,
    emailOutboxDays: env.RETENTION_EMAIL_OUTBOX_DAYS,
    notificationDays: env.RETENTION_NOTIFICATION_DAYS,
    securityEventDays: env.RETENTION_SECURITY_EVENT_DAYS,
    auditLogDays: env.RETENTION_AUDIT_LOG_DAYS,
  });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
