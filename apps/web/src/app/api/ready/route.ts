import { prisma } from "@desafio/database";
import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/observability/logger";

export async function GET() {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("database_timeout")), 3_000)),
    ]);
    const redis = await getRedis();
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("redis_timeout")), 3_000)),
    ]);
    return Response.json(
      { status: "ready", database: "ok", redis: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("readiness_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { status: "not_ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
