import { createHmac, randomUUID } from "node:crypto";

const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|email|phone|ipaddress|ip_address|recipient|signature)/i;

export type LogLevel = "debug" | "info" | "warn" | "error";

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[MAX_DEPTH]";
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => redactSensitive(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactSensitive(item, depth + 1);
    }
    return output;
  }
  if (typeof value === "string" && value.length > 4_000) {
    return `${value.slice(0, 4_000)}…[TRUNCATED]`;
  }
  return value;
}

export function hashIdentifier(value: string, pepper: string): string {
  if (pepper.length < 32) throw new Error("O pepper deve ter pelo menos 32 caracteres.");
  return createHmac("sha256", pepper).update(value.trim().toLowerCase()).digest("hex");
}

export function buildAnonymizedIdentity(
  userId: string,
  at = new Date(),
): { email: string; name: string; nickname: string } {
  const compact = userId.replaceAll("-", "").slice(0, 12).toLowerCase();
  const timestamp = at.toISOString().replace(/\D/g, "").slice(0, 14);
  return {
    email: `deleted+${compact}.${timestamp}@invalid.local`,
    name: "Utilizador eliminado",
    nickname: `jogador-eliminado-${compact}-${timestamp.slice(-6)}`,
  };
}

export function calculateDueAt(receivedAt: Date, calendarDays = 30): Date {
  if (!Number.isInteger(calendarDays) || calendarDays < 1 || calendarDays > 365) {
    throw new Error("Prazo inválido.");
  }
  return new Date(receivedAt.getTime() + calendarDays * 86_400_000);
}

export function retentionCutoff(now: Date, days: number): Date {
  if (!Number.isInteger(days) || days < 0 || days > 3_650) {
    throw new Error("Período de retenção inválido.");
  }
  return new Date(now.getTime() - days * 86_400_000);
}

export function parseOriginList(appUrl: string, extraOrigins = ""): Set<string> {
  const origins = new Set<string>();
  origins.add(new URL(appUrl).origin);
  for (const entry of extraOrigins.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    origins.add(new URL(trimmed).origin);
  }
  return origins;
}

export function isTrustedOrigin(
  origin: string | null,
  appUrl: string,
  extraOrigins = "",
): boolean {
  if (!origin) return true;
  try {
    return parseOriginList(appUrl, extraOrigins).has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function createRequestId(existing?: string | null): string {
  if (existing && /^[A-Za-z0-9._:-]{8,128}$/.test(existing)) return existing;
  return randomUUID();
}

export function buildContentSecurityPolicy(input: {
  nonce: string;
  production: boolean;
  connectOrigins?: string[];
  reportUri?: string;
}): string {
  const connect = new Set(["'self'", ...(input.connectOrigins ?? [])]);
  if (!input.production) {
    connect.add("ws:");
    connect.add("http:");
    connect.add("https:");
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${input.nonce}' 'strict-dynamic'${input.production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${Array.from(connect).join(" ")}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (input.production) directives.push("upgrade-insecure-requests");
  if (input.reportUri) directives.push(`report-uri ${input.reportUri}`);
  return directives.join("; ");
}

export function shouldLog(configured: LogLevel, eventLevel: LogLevel): boolean {
  const weight: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };
  return weight[eventLevel] >= weight[configured];
}
