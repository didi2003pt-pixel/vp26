import Link from "next/link";
import { Card } from "@desafio/ui";
import { SiteHeader } from "@/components/site-header";
import { StageStatusBadge } from "@/components/stage-status-badge";
import { listStagesWithMarkets } from "@/lib/game/queries";
import { formatDate, formatDateTime } from "@/lib/game/format";

export const metadata = { title: "Etapas" };

export default async function StagesPage() {
  const stages = await listStagesWithMarkets();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Volta 2026</p>
        <h1 className="mt-2 text-4xl font-black text-brand-navy">Etapas</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Consulta o calendário, o estado das previsões e os mercados ANC e ORC configurados pela organização.</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {stages.map((stage) => (
            <Card key={stage.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-4xl font-black text-brand-red">{String(stage.number).padStart(2, "0")}</p>
                  <h2 className="mt-2 text-2xl font-black text-brand-navy">{stage.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">{formatDate(stage.stageDate)} · {stage.raceType}</p>
                </div>
                <StageStatusBadge status={stage.status} />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {stage.predictionMarkets.map((market) => (
                  <div key={market.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{market.class.code}</strong>
                      <StageStatusBadge status={market.status} />
                    </div>
                    <p className="mt-2 text-slate-500">Fecha: {formatDateTime(market.closesAt)}</p>
                  </div>
                ))}
              </div>
              <Link href={`/etapas/${stage.slug}`} className="mt-6 inline-flex w-fit rounded-xl bg-brand-navy px-5 py-3 font-black text-white">Detalhes</Link>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
