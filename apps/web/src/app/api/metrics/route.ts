import { NextResponse } from "next/server";
import { getEnv } from "@desafio/config";
import { prisma } from "@desafio/database";

function unauthorized() {
  return new NextResponse("unauthorized\n", {
    status: 401,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const env = getEnv();
  if (!env.METRICS_TOKEN) return new NextResponse("disabled\n", { status: 404 });
  if (request.headers.get("authorization") !== `Bearer ${env.METRICS_TOKEN}`) return unauthorized();

  const [
    users,
    activeSessions,
    openMarkets,
    pendingImports,
    failedCalculations,
    pendingPrivacyRequests,
    criticalSecurityEvents,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.predictionMarket.count({ where: { status: "OPEN" } }),
    prisma.resultImport.count({ where: { status: { in: ["PARSED", "NEEDS_REVIEW", "READY"] } } }),
    prisma.calculationRun.count({ where: { status: "FAILED" } }),
    prisma.dataSubjectRequest.count({
      where: { status: { in: ["RECEIVED", "IDENTITY_VERIFICATION", "IN_PROGRESS"] } },
    }),
    prisma.securityEvent.count({
      where: { severity: "CRITICAL", createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    }),
  ]);

  const memory = process.memoryUsage();
  const lines = [
    "# HELP desafio_active_users Active user accounts.",
    "# TYPE desafio_active_users gauge",
    `desafio_active_users ${users}`,
    "# HELP desafio_active_sessions Non-revoked, non-expired sessions.",
    "# TYPE desafio_active_sessions gauge",
    `desafio_active_sessions ${activeSessions}`,
    "# HELP desafio_open_markets Prediction markets currently open.",
    "# TYPE desafio_open_markets gauge",
    `desafio_open_markets ${openMarkets}`,
    "# HELP desafio_pending_result_imports Result imports awaiting review or confirmation.",
    "# TYPE desafio_pending_result_imports gauge",
    `desafio_pending_result_imports ${pendingImports}`,
    "# HELP desafio_failed_calculations Failed score calculation runs.",
    "# TYPE desafio_failed_calculations gauge",
    `desafio_failed_calculations ${failedCalculations}`,
    "# HELP desafio_pending_privacy_requests Data-subject requests not completed.",
    "# TYPE desafio_pending_privacy_requests gauge",
    `desafio_pending_privacy_requests ${pendingPrivacyRequests}`,
    "# HELP desafio_critical_security_events_24h Critical security events in the last 24 hours.",
    "# TYPE desafio_critical_security_events_24h gauge",
    `desafio_critical_security_events_24h ${criticalSecurityEvents}`,
    "# HELP desafio_process_resident_memory_bytes Resident memory used by the web process.",
    "# TYPE desafio_process_resident_memory_bytes gauge",
    `desafio_process_resident_memory_bytes ${memory.rss}`,
  ];
  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
