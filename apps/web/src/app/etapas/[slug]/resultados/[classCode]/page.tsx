import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { SiteHeader } from "@/components/site-header";
import { isFeatureEnabled } from "@/lib/game/flags";

function formatSeconds(value: number | null): string {
  if (value == null) return "—";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export default async function PublicResultPage({ params }: { params: Promise<{ slug: string; classCode: string }> }) {
  const { slug, classCode } = await params;
  const enabled = await isFeatureEnabled("results_enabled");
  const market = await prisma.predictionMarket.findFirst({ where: { stage: { slug }, class: { code: classCode.toUpperCase() } }, include: { stage: true, class: true } });
  if (!market) notFound();
  const result = await prisma.stageResult.findFirst({
    where: { stageId: market.stageId, classId: market.classId, isCurrent: true, status: { in: ["PROVISIONAL", "OFFICIAL"] } },
    include: { entries: { orderBy: [{ position: "asc" }, { boat: { publicName: "asc" } }], include: { boat: { include: { identifiers: { where: { type: "SAIL_NUMBER", isCurrent: true }, take: 1 } } } } } },
  });
  return (
    <><SiteHeader /><main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link href={`/etapas/${slug}`} className="font-bold text-brand-blue">← Etapa {market.stage.number}</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-black text-brand-red">Etapa {market.stage.number} · {market.class.code}</p><h1 className="mt-1 text-4xl font-black text-brand-navy">Resultados</h1><p className="mt-2 text-slate-600">{market.stage.name}</p></div>{result ? <Badge tone={result.status === "OFFICIAL" ? "success" : "warning"}>{result.status}</Badge> : null}</div>
      {!enabled ? <Alert tone="info" className="mt-6">Os resultados ainda não estão publicados no jogo.</Alert> : enabled && !result ? <Alert tone="info" className="mt-6">Ainda não existe resultado confirmado para esta classe.</Alert> : null}
      {enabled && result ? <Card className="mt-6 overflow-x-auto p-0"><table className="w-full min-w-[740px] text-left text-sm"><thead className="bg-brand-navy text-white"><tr><th className="p-3">Pos.</th><th className="p-3">Embarcação</th><th className="p-3">Vela</th><th className="p-3">Estado</th><th className="p-3">Tempo</th><th className="p-3">Corrigido</th></tr></thead><tbody>{result.entries.map((entry) => <tr key={entry.id} className="border-b border-slate-100"><td className="p-3 text-xl font-black text-brand-red">{entry.position ?? "—"}</td><td className="p-3 font-black text-brand-navy">#{entry.boat.boatNumber} · {entry.boat.publicName}</td><td className="p-3">{entry.boat.identifiers[0]?.value ?? "—"}</td><td className="p-3">{entry.status}</td><td className="p-3">{formatSeconds(entry.elapsedSeconds)}</td><td className="p-3">{formatSeconds(entry.correctedSeconds)}</td></tr>)}</tbody></table></Card> : null}
      {enabled && result ? <Link href={`/classificacoes/etapa/${slug}/${classCode.toLowerCase()}`} className="mt-6 inline-flex rounded-xl bg-brand-red px-5 py-3 font-black text-white">Ver classificação da etapa</Link> : null}
    </main></>
  );
}
