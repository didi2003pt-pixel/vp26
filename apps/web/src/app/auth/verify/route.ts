import { NextResponse } from "next/server";
import { hashOpaqueToken } from "@desafio/auth";
import { getEnv } from "@desafio/config";
import { prisma } from "@desafio/database";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?verified=invalid", request.url));

  const tokenHash = hashOpaqueToken(token, getEnv().AUTH_PEPPER);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.redirect(new URL("/login?verified=expired", request.url));
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { status: "ACTIVE", emailVerifiedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorUserId: record.userId, action: "EMAIL_VERIFIED", entityType: "User", entityId: record.userId } }),
  ]);

  return NextResponse.redirect(new URL("/login?verified=true", request.url));
}
