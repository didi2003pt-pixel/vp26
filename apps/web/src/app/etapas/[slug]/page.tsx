import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card } from "@desafio/ui";
import { SiteHeader } from "@/components/site-header";
import { StageStatusBadge } from "@/components/stage-status-badge";
import { classLabel, formatDate, formatDateTime } from "@/lib/game/format";
import { getFeatureFlags } from "@/lib/game/flags";
import { getStageBySlug } from "@/lib/game/queries";

export default async function StageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [stage, flags] = await Promise.all([
    getStageBySlug(slug),
    getFeatureFlags("preclose_stats_enabled", "results_enabled", "rankings_enabled"),
  ]);
  if (!stage) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <Link href="/etapas" className="text-sm font-bold text-brand-blue">← Todas as etapas</Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-5xl font-black text-brand-red">Etapa {String(stage.number).padStart(2, "0")}</p>
            <h1 className="mt-3 text-4xl font-black text-brand-navy">{stage.name}</h1>
            <p className="mt-3 text-slate-600">{formatDate(stage.stageDate)} · {stage.raceType}</p>
          </div>
          <StageStatusBadge status={stage.status} />
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {stage.predictionMarkets.map((market) => (
            <Card key={market.id}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-brand-navy">{classLabel(market.class.code)}</h2>
                <StageStatusBadge status={market.status} />
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Abertura</dt><dd className="font-bold">{formatDateTime(market.opensAt)}</dd></div>
                <div><dt className="text-slate-500">Fecho</dt><dd className="font-bold">{formatDateTime(market.closesAt)}</dd></div>
                <div><dt className="text-slate-500">Previsões recebidas</dt><dd className="font-bold">{market.status === "OPEN" && !flags.preclose_stats_enabled ? "Oculto até ao fecho" : market._count.predictions}</dd></div>
                <div><dt className="text-slate-500">Pergunta especial</dt><dd className="font-bold">{market.specialQuestion?.active ? "Ativa" : "Por configurar"}</dd></div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/jogar/${stage.slug}/${market.class.code.toLowerCase()}`} className="inline-flex rounded-xl bg-brand-red px-5 py-3 font-black text-white">Fazer previsão</Link>
                {flags.results_enabled && stage.results.some((result) => result.classId === market.classId) ? <Link href={`/etapas/${stage.slug}/resultados/${market.class.code.toLowerCase()}`} className="inline-flex rounded-xl bg-brand-navy px-5 py-3 font-black text-white">Resultados</Link> : null}
                {flags.rankings_enabled && stage.results.some((result) => result.classId === market.classId) ? <Link href={`/classificacoes/etapa/${stage.slug}/${market.class.code.toLowerCase()}`} className="inline-flex rounded-xl border border-brand-navy px-5 py-3 font-black text-brand-navy">Classificação</Link> : null}
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-black text-brand-navy">Embarcações previstas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stage.stageBoats.map(({ boat, surpriseEligible }) => {
              const sail = boat.identifiers[0]?.value ?? "Vela por validar";
              return (
                <Link key={boat.id} href={`/embarcacoes/${boat.boatNumber}`} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-blue">
                  <div className="flex justify-between gap-3">
                    <div><p className="font-black text-brand-navy">#{boat.boatNumber} · {boat.publicName}</p><p className="mt-1 text-sm text-slate-500">{sail} · {boat.class.parent?.code ?? boat.class.code}</p></div>
                    {surpriseEligible ? <span className="text-xs font-bold text-brand-lime">Surpresa</span> : null}
                  </div>
                </Link>
              );
            })}
          </div>
          {stage.stageBoats.length === 0 ? <Alert tone="warning" className="mt-4">Ainda não existem embarcações associadas a esta etapa.</Alert> : null}
        </section>
      </main>
    </>
  );
}
