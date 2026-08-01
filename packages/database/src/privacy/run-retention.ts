import "dotenv/config";
import { runRetention } from "./retention-service";

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} inválida.`);
  return value;
}

const result = await runRetention({
  sessionDays: numberEnv("RETENTION_SESSION_DAYS", 30),
  tokenDays: numberEnv("RETENTION_TOKEN_DAYS", 7),
  emailOutboxDays: numberEnv("RETENTION_EMAIL_OUTBOX_DAYS", 90),
  notificationDays: numberEnv("RETENTION_NOTIFICATION_DAYS", 180),
  securityEventDays: numberEnv("RETENTION_SECURITY_EVENT_DAYS", 365),
  auditLogDays: numberEnv("RETENTION_AUDIT_LOG_DAYS", 730),
});

console.log(JSON.stringify(result, null, 2));
