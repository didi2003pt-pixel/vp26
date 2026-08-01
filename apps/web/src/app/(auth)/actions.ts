"use server";

import { redirect } from "next/navigation";
import {
  createOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  loginSchema,
  normalizeEmail,
  registrationSchema,
  slugify,
  verifyPassword,
} from "@desafio/auth";
import { getEnv } from "@desafio/config";
import { prisma } from "@desafio/database";
import { createSession, revokeCurrentSession } from "@/lib/session";
import { getRequestContext } from "@/lib/request-context";
import { rateLimit } from "@/lib/redis";
import { hashIdentifier } from "@desafio/operations";
import { recordSecurityEvent } from "@/lib/security/security-event";
import { sendVerificationEmail } from "@/lib/mail";

export type FormState = { message?: string; fields?: Record<string, string[]> };

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getRequestContext();
  const limiter = await rateLimit(`register:${context.ipHash ?? "unknown"}`, 5, 3600);
  if (!limiter.allowed) return { message: "Foram efetuadas demasiadas tentativas. Tenta mais tarde." };

  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Revê os campos assinalados.", fields: parsed.error.flatten().fieldErrors };

  const env = getEnv();
  const registrationFlag = await prisma.featureFlag.findUnique({ where: { key: "registrations_enabled" } });
  if (!registrationFlag?.enabled && env.NODE_ENV === "production") {
    return { message: "O registo público ainda não está aberto." };
  }
  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { message: "Já existe uma conta associada a este email." };

  const nicknameExists = await prisma.profile.findUnique({ where: { nickname: parsed.data.nickname }, select: { id: true } });
  if (nicknameExists) return { message: "Esse nickname já está a ser utilizado." };

  const passwordHash = await hashPassword(parsed.data.password);
  const citySlug = slugify(`${parsed.data.city}-${parsed.data.country}`);
  const participantRole = await prisma.role.findUnique({ where: { code: "PARTICIPANT" } });
  if (!participantRole) throw new Error("Role PARTICIPANT não foi criada. Executa o seed.");

  const verificationToken = createOpaqueToken();
  const verificationTokenHash = hashOpaqueToken(verificationToken, env.AUTH_PEPPER);

  const user = await prisma.$transaction(async (tx) => {
    const city = await tx.city.upsert({
      where: { slug: citySlug },
      update: { name: parsed.data.city, active: true },
      create: { name: parsed.data.city, slug: citySlug, countryCode: parsed.data.country },
    });
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        status: env.AUTH_REQUIRE_EMAIL_VERIFICATION ? "PENDING_VERIFICATION" : "ACTIVE",
        emailVerifiedAt: env.AUTH_REQUIRE_EMAIL_VERIFICATION ? null : new Date(),
        profile: {
          create: { name: parsed.data.name, nickname: parsed.data.nickname, cityId: city.id, countryCode: parsed.data.country },
        },
        roles: { create: { roleId: participantRole.id } },
        consents: {
          create: [
            { type: "TERMS", version: env.TERMS_VERSION, granted: true, ...context },
            { type: "PRIVACY", version: env.PRIVACY_VERSION, granted: true, ...context },
          ],
        },
        verificationTokens: env.AUTH_REQUIRE_EMAIL_VERIFICATION
          ? { create: { tokenHash: verificationTokenHash, expiresAt: new Date(Date.now() + 24 * 3600_000) } }
          : undefined,
      },
    });
    await tx.auditLog.create({
      data: { actorUserId: created.id, action: "USER_REGISTERED", entityType: "User", entityId: created.id, metadata: context },
    });
    return created;
  });

  if (env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
    try { await sendVerificationEmail(email, verificationToken); } catch { return { message: "Conta criada, mas o email não foi enviado. Contacta a organização." }; }
    redirect("/verify-email");
  }

  await createSession(user.id);
  redirect("/jogar");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getRequestContext();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Email ou palavra-passe inválidos." };

  const email = normalizeEmail(parsed.data.email);
  const limiter = await rateLimit(`login:${context.ipHash ?? "unknown"}:${hashIdentifier(email, getEnv().IP_HASH_PEPPER)}`, 10, 900);
  if (!limiter.allowed) return { message: "Foram efetuadas demasiadas tentativas. Tenta mais tarde." };

  const user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    if (user) {
      const nextFailures = user.failedLoginCount + 1;
      const lock = nextFailures >= 5;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : nextFailures,
          lockedUntil: lock ? new Date(Date.now() + 15 * 60_000) : null,
        },
      });
    }
    await recordSecurityEvent({
      severity: "WARNING",
      eventType: "LOGIN_FAILED",
      actorUserId: user?.id ?? null,
      requestId: context.requestId,
      ipHash: context.ipHash,
      route: "/login",
      method: "POST",
      metadata: { knownAccount: Boolean(user), lockedAfterAttempt: Boolean(user && user.failedLoginCount + 1 >= 5) },
    });
    return { message: "Email ou palavra-passe inválidos." };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { message: "A conta está temporariamente bloqueada." };
  if (user.status === "PENDING_VERIFICATION") return { message: "Confirma primeiro o teu endereço de email." };
  if (user.status !== "ACTIVE") return { message: "A conta não está ativa." };

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await prisma.auditLog.create({ data: { actorUserId: user.id, action: "USER_LOGIN", entityType: "User", entityId: user.id, metadata: context } });
  await createSession(user.id);
  redirect(user.roles.some(({ role }) => ["ADMIN", "SUPERADMIN", "RESULTS_MANAGER"].includes(role.code)) ? "/admin" : "/jogar");
}

export async function logoutAction(): Promise<void> {
  await revokeCurrentSession();
  redirect("/login");
}
