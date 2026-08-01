import Link from "next/link";
import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";

export default async function AdminPage() {
  const [boats, stages, users, markets, predictions, imports, results, calculations, flags] = await Promise.all([
    prisma.boat.count(),
    prisma.stage.count(),
    prisma.user.count(),
    prisma.predictionMarket.count(),
    prisma.prediction.count(),
    prisma.resultImport.count(),
    prisma.stageResult.count({ where: { isCurrent: true } }),
    prisma.calculationRun.count({ where: { isCurrent: true, status: "COMPLETED" } }),
    prisma.featureFlag.findMany({ orderBy: { key: "asc" } }),
  ]);
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Fase 3 · Resultados e pontuação</p>
      <h1 className="mt-1 text-3xl font-black text-brand-navy">Painel administrativo</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Embarcações</p><p className="text-4xl font-black">{boats}</p></Card>
        <Card><p className="text-sm text-slate-500">Etapas / mercados</p><p className="text-4xl font-black">{stages} / {markets}</p></Card>
        <Card><p className="text-sm text-slate-500">Previsões</p><p className="text-4xl font-black">{predictions}</p></Card>
        <Card><p className="text-sm text-slate-500">Utilizadores</p><p className="text-4xl font-black">{users}</p></Card>
        <Card><p className="text-sm text-slate-500">Importações</p><p className="text-4xl font-black">{imports}</p></Card>
        <Card><p className="text-sm text-slate-500">Resultados atuais</p><p className="text-4xl font-black">{results}</p></Card>
        <Card><p className="text-sm text-slate-500">Cálculos atuais</p><p className="text-4xl font-black">{calculations}</p></Card>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black text-brand-navy">Operação</h2>
          <div className="mt-4 grid gap-3">
            <Link className="rounded-xl bg-brand-red px-4 py-3 font-black text-white" href="/admin/resultados">Importar resultados, calcular pontos e publicar rankings</Link>
            <Link className="rounded-xl bg-brand-navy px-4 py-3 font-black text-white" href="/admin/etapas">Configurar etapas, mercados e perguntas</Link>
            <Link className="rounded-xl bg-slate-100 px-4 py-3 font-black text-brand-navy" href="/admin/embarcacoes">Consultar embarcações</Link>
            <Link className="rounded-xl bg-slate-100 px-4 py-3 font-black text-brand-navy" href="/admin/configuracao">Controlar feature flags</Link>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black text-brand-navy">Feature flags</h2>
          <dl className="mt-4 grid gap-3">
            {flags.map((flag) => <div key={flag.key} className="flex justify-between border-b pb-2"><dt>{flag.key}</dt><dd className="font-bold">{flag.enabled ? "Ativa" : "Desativada"}</dd></div>)}
          </dl>
        </Card>
      </div>
    </main>
  );
}
