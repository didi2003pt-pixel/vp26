import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().min(1).default("Desafio Volta à Vela"),
  TRUSTED_ORIGINS: z.string().default(""),
  CSP_REPORT_ONLY: booleanFromString.default("false"),
  SECURITY_CONTACT_EMAIL: z.string().email().default("seguranca@example.invalid"),
  PRIVACY_CONTACT_EMAIL: z.string().email().default("privacidade@example.invalid"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  STORE_RAW_IP_ADDRESSES: booleanFromString.default("false"),
  IP_HASH_PEPPER: z.string().min(32),
  METRICS_TOKEN: z.string().min(24).optional(),
  DATA_SUBJECT_REQUEST_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  ACCOUNT_DELETION_GRACE_DAYS: z.coerce.number().int().min(0).max(90).default(7),
  RETENTION_SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  RETENTION_TOKEN_DAYS: z.coerce.number().int().min(1).max(365).default(7),
  RETENTION_EMAIL_OUTBOX_DAYS: z.coerce.number().int().min(1).max(730).default(90),
  RETENTION_NOTIFICATION_DAYS: z.coerce.number().int().min(1).max(730).default(180),
  RETENTION_SECURITY_EVENT_DAYS: z.coerce.number().int().min(30).max(3650).default(365),
  RETENTION_AUDIT_LOG_DAYS: z.coerce.number().int().min(90).max(3650).default(730),
  RETENTION_CRON_SECRET: z.string().min(24).optional(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1),
  AUTH_PEPPER: z.string().min(32),
  AUTH_REQUIRE_EMAIL_VERIFICATION: booleanFromString.default("true"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  RATE_LIMIT_FAIL_OPEN: booleanFromString.default("false"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_SECURE: booleanFromString.default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().min(1),
  TERMS_VERSION: z.string().min(1),
  PRIVACY_VERSION: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanFromString.default("true"),
  SAILTI_BASE_URL: z.string().url(),
  SAILTI_RACES_URL: z.string().url(),
  SAILTI_RESULTS_URL: z.string().url(),
  SAILTI_PROVIDER: z.enum(["api", "file", "xrr", "html", "manual"]).default("file"),
  SAILTI_XRR_ENABLED: booleanFromString.default("true"),
  RESULT_IMPORT_MAX_BYTES: z.coerce.number().int().min(1_024).max(50_000_000).default(5_242_880),
  RESULT_RECALCULATION_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(5),
  CRON_SECRET: z.string().min(24).optional(),
  RESULTS_CRON_SECRET: z.string().min(24).optional(),
}).superRefine((env, context) => {
  if (env.NODE_ENV !== "production") return;

  const addIssue = (path: string, message: string) => {
    context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  };

  if (!env.APP_URL.startsWith("https://")) {
    addIssue("APP_URL", "APP_URL tem de usar HTTPS em produção.");
  }
  if (!env.TRUSTED_ORIGINS.trim()) {
    addIssue("TRUSTED_ORIGINS", "TRUSTED_ORIGINS é obrigatório em produção.");
  }
  if (env.SECURITY_CONTACT_EMAIL.endsWith("@example.invalid")) {
    addIssue("SECURITY_CONTACT_EMAIL", "Defina um contacto real de segurança.");
  }
  if (env.PRIVACY_CONTACT_EMAIL.endsWith("@example.invalid")) {
    addIssue("PRIVACY_CONTACT_EMAIL", "Defina um contacto real de privacidade.");
  }
  for (const [name, value] of [
    ["METRICS_TOKEN", env.METRICS_TOKEN],
    ["CRON_SECRET", env.CRON_SECRET],
    ["RESULTS_CRON_SECRET", env.RESULTS_CRON_SECRET],
    ["RETENTION_CRON_SECRET", env.RETENTION_CRON_SECRET],
  ] as const) {
    if (!value) addIssue(name, `${name} é obrigatório em produção.`);
  }
});

export type AppEnv = z.infer<typeof schema>;

let cache: AppEnv | undefined;

export function getEnv(): AppEnv {
  cache ??= schema.parse(process.env);
  return cache;
}
