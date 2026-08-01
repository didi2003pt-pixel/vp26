import Link from "next/link";
import { Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";

export default async function AdminResultsPage() {
  const markets = await prisma.predictionMarket.findMany({
    orderBy: [{ stage: { number: "asc" } }, { class: { code: "asc" } }],
    include: {
      stage: true,
      class: true,
      _count: { select: { predictions: true } },
    },
  });
  const currentResults = await prisma.stageResult.findMany({
    where: { isCurrent: true },
    include: { calculationRuns: { where: { isCurrent: true }, take: 1 } },
  });
  const resultMap = new Map(currentResults.map((result) => [`${result.stageId}:${result.classId}`, result]));

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Fase 3 · Resultados</p>
      <h1 className="mt-1 text-3xl font-black text-brand-navy">Resultados, pontuação e rankings</h1>
      <p className="mt-2 max-w-3xl text-slate-600">Importa uma fonte oficial, revê as correspondências, confirma o resultado e só depois calcula os pontos.</p>
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {markets.map((market) => {
          const result = resultMap.get(`${market.stageId}:${market.classId}`);
          const run = result?.calculationRuns[0];
          return (
            <Card key={market.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-brand-red">Etapa {market.stage.number} · {market.class.code}</p>
                  <h2 className="mt-1 text-xl font-black text-brand-navy">{market.stage.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">{market._count.predictions} previsões recebidas</p>
                </div>
                <Badge tone={result?.status === "OFFICIAL" ? "success" : result ? "warning" : "neutral"}>{result ? `${result.status} v${result.version}` : "Sem resultado"}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-slate-100 px-3 py-1">Mercado: {market.status}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Cálculo: {run?.status ?? "não executado"}</span>
              </div>
              <Link href={`/admin/resultados/${market.id}`} className="mt-5 inline-flex rounded-xl bg-brand-navy px-4 py-2.5 font-black text-white">Gerir resultado</Link>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
