import { NextResponse } from "next/server";
import { closeExpiredMarkets } from "@desafio/database";
import { getEnv } from "@desafio/config";

export async function POST(request: Request) {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const result = await closeExpiredMarkets();
  return NextResponse.json(result);
}
