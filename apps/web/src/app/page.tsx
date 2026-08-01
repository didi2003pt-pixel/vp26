import Image from "next/image";
import Link from "next/link";
import { Card } from "@desafio/ui";
import { SiteHeader } from "@/components/site-header";
import { StageStatusBadge } from "@/components/stage-status-badge";
import { listStagesWithMarkets } from "@/lib/game/queries";
import { formatDate } from "@/lib/game/format";

export default async function HomePage() {
  const stages = await listStagesWithMarkets();
  const current = stages.find((stage) => ["PREDICTIONS_OPEN", "IN_PROGRESS"].includes(stage.status)) ?? stages[0];

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-brand-navy text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-14">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-yellow">Volta a Portugal à Vela 2026</p>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">Faz as tuas previsões. Vive cada etapa.</h1>
              <p className="mt-5 max-w-2xl text-lg text-white/80">
                Escolhe o pódio, encontra a embarcação surpresa e compete em ANC e ORC. A configuração pública permanece protegida por feature flags até validação da organização.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/jogar" className="rounded-xl bg-brand-red px-6 py-3 font-black text-white">Jogar agora</Link>
                <Link href="/etapas" className="rounded-xl border border-white/30 px-6 py-3 font-black">Ver etapas</Link>
              </div>
            </div>
            <Image
              src="/brand/percurso-etapas-2026.png"
              width={1268}
              height={357}
              priority
              alt="Percurso e oito etapas da Volta a Portugal à Vela 2026"
              className="w-full rounded-3xl border border-white/10 shadow-2xl"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Escolhe ANC ou ORC"],
              ["2", "Prevê o pódio e a surpresa"],
              ["3", "Confirma antes do fecho"],
            ].map(([number, label]) => (
              <Card key={number} className="flex items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-yellow text-xl font-black text-brand-navy">{number}</span>
                <p className="font-black text-brand-navy">{label}</p>
              </Card>
            ))}
          </div>

          {current ? (
            <Card className="mt-8 overflow-hidden border-0 bg-gradient-to-r from-brand-blue to-brand-navy text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-white/70">Etapa em destaque</p>
                  <h2 className="mt-2 text-3xl font-black">Etapa {String(current.number).padStart(2, "0")} · {current.name}</h2>
                  <p className="mt-2 text-white/75">{formatDate(current.stageDate)}</p>
                </div>
                <StageStatusBadge status={current.status} />
              </div>
              <Link href={`/etapas/${current.slug}`} className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-black text-brand-navy">Abrir etapa</Link>
            </Card>
          ) : null}

          <div className="mt-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Calendário</p>
              <h2 className="mt-1 text-3xl font-black text-brand-navy">As oito etapas</h2>
            </div>
            <Link className="font-bold text-brand-blue" href="/etapas">Ver todas →</Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stages.map((stage) => (
              <Link key={stage.id} href={`/etapas/${stage.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-3xl font-black text-brand-red">{String(stage.number).padStart(2, "0")}</span>
                  <StageStatusBadge status={stage.status} />
                </div>
                <h3 className="mt-4 font-black text-brand-navy group-hover:text-brand-blue">{stage.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{formatDate(stage.stageDate)}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
