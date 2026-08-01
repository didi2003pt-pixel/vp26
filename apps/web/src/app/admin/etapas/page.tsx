import Link from "next/link";
import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { StageStatusBadge } from "@/components/stage-status-badge";
import { formatDate, formatDateTime } from "@/lib/game/format";

export default async function AdminStagesPage() {
  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
    include: { predictionMarkets: { include: { class: true }, orderBy: { class: { code: "asc" } } } },
  });

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Administração</p><h1 className="mt-1 text-3xl font-black text-brand-navy">Etapas e mercados</h1></div>
        <Link href="/admin" className="font-bold text-brand-blue">← Dashboard</Link>
      </div>
      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {stages.map((stage) => (
          <Card key={stage.id}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-bold text-brand-red">Etapa {String(stage.number).padStart(2, "0")}</p><h2 className="mt-1 text-xl font-black text-brand-navy">{stage.name}</h2><p className="mt-2 text-sm text-slate-500">{formatDate(stage.stageDate)} · partida {formatDateTime(stage.scheduledStartAt)}</p></div>
              <StageStatusBadge status={stage.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stage.predictionMarkets.map((market) => <span key={market.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{market.class.code}: {market.status}</span>)}
            </div>
            <Link href={`/admin/etapas/${stage.id}`} className="mt-5 inline-flex rounded-xl bg-brand-navy px-4 py-2.5 font-black text-white">Configurar</Link>
          </Card>
        ))}
      </div>
    </main>
  );
}
