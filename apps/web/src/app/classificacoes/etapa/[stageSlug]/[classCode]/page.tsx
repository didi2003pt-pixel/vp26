import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { SiteHeader } from "@/components/site-header";
import { isFeatureEnabled } from "@/lib/game/flags";

export default async function StageRankingPage({ params }: { params: Promise<{ stageSlug: string; classCode: string }> }) {
  const { stageSlug, classCode } = await params;
  const enabled = await isFeatureEnabled("rankings_enabled");
  const market = await prisma.predictionMarket.findFirst({ where: { stage: { slug: stageSlug }, class: { code: classCode.toUpperCase() } }, include: { stage: true, class: true } });
  if (!market) notFound();
  const snapshot = await prisma.rankingSnapshot.findFirst({
    where: { scope: "STAGE", stageId: market.stageId, classId: market.classId, status: { in: ["PROVISIONAL", "DEFINITIVE"] } },
    orderBy: { generatedAt: "desc" },
    include: { entries: { orderBy: { rank: "asc" }, take: 100 } },
  });
  return (
    <><SiteHeader /><main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <Link href={`/etapas/${stageSlug}`} className="font-bold text-brand-blue">← Etapa {market.stage.number}</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-black text-brand-red">Etapa {market.stage.number} · {market.class.code}</p><h1 className="mt-1 text-4xl font-black text-brand-navy">Classificação da etapa</h1><p className="mt-2 text-slate-600">{market.stage.name}</p></div>{snapshot ? <Badge tone={snapshot.status === "DEFINITIVE" ? "success" : "warning"}>{snapshot.status}</Badge> : null}</div>
      {!enabled ? <Alert tone="info" className="mt-6">A classificação ainda não está publicada.</Alert> : enabled && !snapshot ? <Alert tone="info" className="mt-6">Ainda não existe pontuação calculada para esta etapa.</Alert> : null}
      {enabled && snapshot ? <Card className="mt-6 overflow-x-auto p-0"><table className="w-full min-w-[560px] text-left"><thead className="bg-brand-navy text-white"><tr><th className="p-3">Pos.</th><th className="p-3">Jogador</th><th className="p-3 text-right">Pontos</th></tr></thead><tbody>{snapshot.entries.map((entry) => <tr key={entry.id} className="border-b border-slate-100"><td className="p-3 text-xl font-black text-brand-red">{entry.rank}º</td><td className="p-3 font-black text-brand-navy">{entry.displayName}</td><td className="p-3 text-right font-black">{entry.rawPoints}</td></tr>)}</tbody></table></Card> : null}
    </main></>
  );
}
