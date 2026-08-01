import Link from "next/link";
import { Alert, Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { SiteHeader } from "@/components/site-header";
import { isFeatureEnabled } from "@/lib/game/flags";

function displayAverage(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("pt-PT", { maximumFractionDigits: 1 }) : "0";
}

export const metadata = { title: "Classificação por cidade" };

export default async function CityRankingsPage() {
  const enabled = await isFeatureEnabled("rankings_enabled");
  const classes = await prisma.raceClass.findMany({ where: { code: { in: ["ANC", "ORC"] } }, orderBy: { code: "asc" } });
  const snapshots = await Promise.all(classes.map((raceClass) => prisma.rankingSnapshot.findFirst({
    where: { scope: "CITY", classId: raceClass.id, status: { in: ["PROVISIONAL", "DEFINITIVE"] } },
    orderBy: { generatedAt: "desc" },
    include: { entries: { orderBy: { rank: "asc" }, take: 100 } },
  })));

  return <><SiteHeader /><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <Link href="/classificacoes" className="font-bold text-brand-blue">← Classificação geral</Link>
    <p className="mt-6 text-sm font-black uppercase tracking-[0.15em] text-brand-red">Rivalidade geográfica</p>
    <h1 className="mt-1 text-4xl font-black text-brand-navy">Classificação por cidade</h1>
    <p className="mt-3 max-w-3xl text-slate-600">Média dos dez melhores participantes de cada cidade, ou de todos quando existirem menos de dez.</p>
    {!enabled ? <Alert tone="info" className="mt-6">As classificações ainda não estão publicadas.</Alert> : null}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">{classes.map((raceClass, index) => {
      const snapshot = snapshots[index];
      return <Card key={raceClass.id} className="overflow-x-auto p-0">
        <div className="flex items-center justify-between gap-4 px-5 pt-5"><h2 className="text-2xl font-black text-brand-navy">{raceClass.code}</h2>{snapshot ? <Badge tone={snapshot.status === "DEFINITIVE" ? "success" : "warning"}>{snapshot.status}</Badge> : null}</div>
        {enabled && snapshot ? <table className="mt-4 w-full min-w-[560px] text-left text-sm"><thead className="bg-brand-navy text-white"><tr><th className="p-3">Pos.</th><th className="p-3">Cidade</th><th className="p-3 text-right">Média</th><th className="p-3 text-right">Jogadores</th></tr></thead><tbody>{snapshot.entries.map((entry) => <tr key={entry.id} className="border-b border-slate-100"><td className="p-3 text-xl font-black text-brand-red">{entry.rank}º</td><td className="p-3 font-black text-brand-navy">{entry.displayName}</td><td className="p-3 text-right font-black">{displayAverage(entry.points)} pts</td><td className="p-3 text-right">{entry.participants}</td></tr>)}</tbody></table> : <p className="p-5 text-sm text-slate-500">Ainda não existe uma classificação publicada.</p>}
      </Card>;
    })}</div>
  </main></>;
}
