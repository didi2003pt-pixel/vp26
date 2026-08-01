import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { calculateResultAction } from "../actions";
import { UploadResultForm } from "./upload-form";
import { ManualResultForm } from "./manual-result-form";

export default async function AdminMarketResultPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params;
  const market = await prisma.predictionMarket.findUnique({
    where: { id: marketId },
    include: { stage: true, class: true },
  });
  if (!market) notFound();
  const [imports, results] = await Promise.all([
    prisma.resultImport.findMany({
      where: { stageId: market.stageId, classId: market.classId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { rows: true } } },
    }),
    prisma.stageResult.findMany({
      where: { stageId: market.stageId, classId: market.classId },
      orderBy: { version: "desc" },
      include: { entries: true, calculationRuns: { orderBy: { runNumber: "desc" } } },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link href="/admin/resultados" className="font-bold text-brand-blue">← Todos os resultados</Link>
      <p className="mt-6 text-sm font-black uppercase tracking-[0.15em] text-brand-red">Etapa {market.stage.number} · {market.class.code}</p>
      <h1 className="mt-1 text-3xl font-black text-brand-navy">{market.stage.name}</h1>
      <div className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <h2 className="text-xl font-black text-brand-navy">Nova importação</h2>
          <p className="mt-2 text-sm text-slate-500">Não são publicados resultados sem revisão administrativa.</p>
          <div className="mt-5"><UploadResultForm stageId={market.stageId} classId={market.classId} marketId={market.id} /></div>
          <details className="mt-6 border-t border-slate-200 pt-5"><summary className="cursor-pointer font-black text-brand-navy">Fallback: introdução manual</summary><div className="mt-4"><ManualResultForm stageId={market.stageId} classId={market.classId} marketId={market.id} /></div></details>
        </Card>
        <Card>
          <h2 className="text-xl font-black text-brand-navy">Importações</h2>
          <div className="mt-4 grid gap-3">
            {imports.map((item) => (
              <Link key={item.id} href={`/admin/importacoes/${item.id}`} className="rounded-xl border border-slate-200 p-4 hover:border-brand-blue">
                <div className="flex flex-wrap justify-between gap-3"><div><p className="font-black text-brand-navy">{item.sourceName}</p><p className="text-xs text-slate-500">{item.provider} · {item.format} · {item._count.rows} linhas</p></div><Badge tone={item.status === "CONFIRMED" ? "success" : item.status === "READY" ? "info" : "warning"}>{item.status}</Badge></div>
              </Link>
            ))}
            {imports.length === 0 ? <p className="text-sm text-slate-500">Ainda não existem importações.</p> : null}
          </div>
        </Card>
      </div>

      <section className="mt-7 grid gap-4">
        <h2 className="text-2xl font-black text-brand-navy">Versões de resultado</h2>
        {results.map((result) => {
          const currentRun = result.calculationRuns.find(({ isCurrent }) => isCurrent);
          return (
            <Card key={result.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="font-black text-brand-navy">Versão {result.version} · {result.status}</p><p className="mt-1 text-sm text-slate-500">{result.entries.length} embarcações · {result.isCurrent ? "versão atual" : "histórico preservado"}</p></div>
                <div className="flex gap-2"><Badge tone={result.isCurrent ? "success" : "neutral"}>{result.isCurrent ? "ATUAL" : "ARQUIVO"}</Badge><Badge tone={currentRun?.status === "COMPLETED" ? "success" : "warning"}>{currentRun?.status ?? "SEM CÁLCULO"}</Badge></div>
              </div>
              {result.isCurrent ? (
                <form action={calculateResultAction} className="mt-5">
                  <input type="hidden" name="resultId" value={result.id} />
                  <input type="hidden" name="marketId" value={market.id} />
                  <input type="hidden" name="stageSlug" value={market.stage.slug} />
                  <input type="hidden" name="classCode" value={market.class.code} />
                  <button className="rounded-xl bg-brand-red px-4 py-2.5 font-black text-white">{currentRun ? "Recalcular e criar nova versão do cálculo" : "Calcular pontos e rankings"}</button>
                </form>
              ) : null}
            </Card>
          );
        })}
        {results.length === 0 ? <Alert tone="info">Confirma uma importação para criar a primeira versão do resultado.</Alert> : null}
      </section>
    </main>
  );
}
