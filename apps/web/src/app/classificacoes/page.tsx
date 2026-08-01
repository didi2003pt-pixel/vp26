import Link from "next/link";
import { Alert, Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { SiteHeader } from "@/components/site-header";
import { isFeatureEnabled } from "@/lib/game/flags";

export const metadata = { title: "Classificações" };

export default async function RankingsPage() {
  const enabled = await isFeatureEnabled("rankings_enabled");
  const classes = await prisma.raceClass.findMany({ where: { code: { in: ["ANC", "ORC"] } }, orderBy: { code: "asc" } });
  const snapshots = await Promise.all(classes.map((raceClass) => prisma.rankingSnapshot.findFirst({
    where: { scope: "GENERAL", classId: raceClass.id, status: { in: ["PROVISIONAL", "DEFINITIVE"] } },
    orderBy: { generatedAt: "desc" },
    include: { entries: { orderBy: { rank: "asc" }, take: 20 } },
  })));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Desafio Volta à Vela</p>
        <h1 className="mt-1 text-4xl font-black text-brand-navy">Classificações gerais</h1>
        {!enabled ? <Alert tone="info" className="mt-6">As classificações ainda não estão publicadas.</Alert> : null}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {classes.map((raceClass, index) => {
            const snapshot = snapshots[index];
            return (
              <Card key={raceClass.id}>
                <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-black text-brand-navy">{raceClass.code}</h2>{snapshot ? <Badge tone={snapshot.status === "DEFINITIVE" ? "success" : "warning"}>{snapshot.status}</Badge> : null}</div>
                {enabled && snapshot ? (
                  <>
                    <ol className="mt-5 grid gap-2">
                      {snapshot.entries.map((entry) => (
                        <li key={entry.id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"><span className="text-xl font-black text-brand-red">{entry.rank}º</span><span className="font-black text-brand-navy">{entry.displayName}</span><span className="font-black">{entry.rawPoints} pts</span></li>
                      ))}
                    </ol>
                    <p className="mt-4 text-xs text-slate-500">Atualizado em {snapshot.generatedAt.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</p>
                  </>
                ) : <p className="mt-5 text-sm text-slate-500">Ainda não existe um cálculo publicado para esta classe.</p>}
              </Card>
            );
          })}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card><h2 className="text-xl font-black text-brand-navy">Cidades</h2><p className="mt-2 text-sm text-slate-500">Compara as cidades pela média dos dez melhores participantes.</p><Link href="/classificacoes/cidades" className="mt-4 inline-flex rounded-xl bg-brand-red px-4 py-2.5 font-black text-white">Ver cidades</Link></Card>
          <Card><h2 className="text-xl font-black text-brand-navy">Clubes</h2><p className="mt-2 text-sm text-slate-500">Acompanha a classificação dos clubes náuticos.</p><Link href="/classificacoes/clubes" className="mt-4 inline-flex rounded-xl bg-brand-blue px-4 py-2.5 font-black text-white">Ver clubes</Link></Card>
        </div>
        <Card className="mt-6">
          <h2 className="text-xl font-black text-brand-navy">Classificação por etapa</h2>
          <p className="mt-2 text-sm text-slate-500">Consulta cada etapa a partir da página de etapas.</p>
          <Link href="/etapas" className="mt-4 inline-flex rounded-xl bg-brand-navy px-4 py-2.5 font-black text-white">Ver etapas</Link>
        </Card>
      </main>
    </>
  );
}
