import Link from "next/link";
import { Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/authorization";
import { formatDateTime } from "@/lib/game/format";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, cities, predictions, totals, stageScores] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }),
    prisma.city.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.prediction.findMany({
      where: { userId: user.id }, orderBy: { submittedAt: "desc" },
      include: { market: { include: { stage: true, class: true } } }, take: 20,
    }),
    prisma.userTotalScore.findMany({ where: { userId: user.id }, include: { class: true }, orderBy: { class: { code: "asc" } } }),
    prisma.userStageScore.findMany({
      where: { userId: user.id, status: { in: ["PROVISIONAL", "DEFINITIVE"] } }, orderBy: { calculatedAt: "desc" }, take: 20,
      include: { market: { include: { stage: true, class: true } } },
    }),
  ]);

  return (
    <><SiteHeader /><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-4xl font-black text-brand-navy">O teu perfil</h1><Link className="rounded-xl border border-brand-blue px-4 py-2 font-black text-brand-blue" href="/perfil/privacidade">Privacidade e dados</Link></div>
      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        {totals.map((total) => <Card key={total.id}><div className="flex justify-between gap-3"><div><p className="text-sm font-black text-brand-red">Classificação {total.class.code}</p><p className="mt-1 text-4xl font-black text-brand-navy">{total.points} pts</p></div><Badge tone="info">{total.stageCount} etapas</Badge></div><dl className="mt-4 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-slate-500">Vencedores exatos</dt><dd className="font-black">{total.winnerExactCount}</dd></div><div><dt className="text-slate-500">Posições exatas</dt><dd className="font-black">{total.exactPodiumCount}</dd></div><div><dt className="text-slate-500">Surpresas</dt><dd className="font-black">{total.surpriseCorrectCount}</dd></div><div><dt className="text-slate-500">Perguntas</dt><dd className="font-black">{total.specialCorrectCount}</dd></div></dl></Card>)}
        {totals.length === 0 ? <Card className="sm:col-span-2"><p className="text-sm text-slate-500">Ainda não tens pontuação calculada.</p></Card> : null}
      </section>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <Card><h2 className="text-xl font-black text-brand-navy">Dados públicos</h2><p className="mt-2 text-sm text-slate-500">O email nunca aparece nas classificações.</p><div className="mt-6"><ProfileForm profile={profile} cities={cities} /></div></Card>
        <div className="grid gap-6">
          <Card><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-brand-navy">Resultados pessoais</h2><Link href="/classificacoes" className="font-bold text-brand-blue">Classificações →</Link></div><div className="mt-5 grid gap-3">{stageScores.map((score) => <Link key={score.id} href={`/classificacoes/etapa/${score.market.stage.slug}/${score.market.class.code.toLowerCase()}`} className="rounded-xl border border-slate-200 p-4 hover:border-brand-blue"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black text-brand-navy">Etapa {score.market.stage.number} · {score.market.class.code}</p><p className="text-sm text-slate-500">{score.market.stage.name}</p></div><div className="text-right"><p className="text-2xl font-black text-brand-red">{score.points}</p><Badge tone={score.status === "DEFINITIVE" ? "success" : "warning"}>{score.status}</Badge></div></div></Link>)}{stageScores.length === 0 ? <p className="text-sm text-slate-500">Ainda não existem resultados calculados.</p> : null}</div></Card>
          <Card><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-brand-navy">Previsões</h2><Link href="/jogar" className="font-bold text-brand-blue">Nova previsão →</Link></div><div className="mt-5 grid gap-3">{predictions.map((prediction) => <Link key={prediction.id} href={`/jogar/${prediction.market.stage.slug}/${prediction.market.class.code.toLowerCase()}`} className="rounded-xl border border-slate-200 p-4 hover:border-brand-blue"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-brand-navy">Etapa {prediction.market.stage.number} · {prediction.market.class.code}</p><p className="mt-1 text-sm text-slate-500">{prediction.market.stage.name}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{prediction.status}</span></div><p className="mt-3 text-xs text-slate-500">Última submissão: {formatDateTime(prediction.submittedAt)}</p></Link>)}{predictions.length === 0 ? <p className="text-sm text-slate-500">Ainda não submeteste previsões.</p> : null}</div></Card>
        </div>
      </div>
    </main></>
  );
}
