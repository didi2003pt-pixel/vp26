import "dotenv/config";
import { prisma } from "../client";
import { closeExpiredMarkets } from "./market-closure";

try {
  const result = await closeExpiredMarkets();
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
