import "dotenv/config";
import { prisma } from "../client";
import { calculateResultScores } from "./scoring-service";

try {
  const results = await prisma.stageResult.findMany({
    where: { isCurrent: true, status: { in: ["PROVISIONAL", "OFFICIAL"] }, calculationRuns: { none: { isCurrent: true, status: "COMPLETED" } } },
    orderBy: { createdAt: "asc" },
  });
  const output: Array<{ id: string }> = [];
  for (const result of results) output.push(await calculateResultScores({ resultId: result.id }));
  console.log(JSON.stringify({ processed: output.length, calculationRunIds: output.map(({ id }) => id) }));
} finally {
  await prisma.$disconnect();
}
