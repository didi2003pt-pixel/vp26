import { getEnv } from "@desafio/config";
import { calculateResultScores, prisma } from "@desafio/database";

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const configured = getEnv().RESULTS_CRON_SECRET ?? getEnv().CRON_SECRET;
  if (!configured || secret !== configured) return Response.json({ error: "Não autorizado." }, { status: 401 });

  const results = await prisma.stageResult.findMany({
    where: {
      isCurrent: true,
      status: { in: ["PROVISIONAL", "OFFICIAL"] },
      calculationRuns: { none: { isCurrent: true, status: "COMPLETED" } },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const calculationRunIds: string[] = [];
  for (const result of results) {
    const run = await calculateResultScores({ resultId: result.id });
    calculationRunIds.push(run.id);
  }
  return Response.json({ processed: calculationRunIds.length, calculationRunIds });
}
