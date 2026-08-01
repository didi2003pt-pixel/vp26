import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { createScoringRuleVersionAction } from "./actions";

const labels: Record<string, string> = {
  WINNER_EXACT: "Vencedor exato",
  PODIUM_EXACT_SECOND: "Segundo lugar exato",
  PODIUM_EXACT_THIRD: "Terceiro lugar exato",
  PODIUM_WRONG_POSITION: "Embarcação no pódio noutra posição",
  SURPRISE_TOP_FIVE: "Surpresa no top 5",
  SPECIAL_QUESTION_CORRECT: "Pergunta especial correta",
  ALL_ELIGIBLE_STAGES_BONUS: "Bónus de participação em todas as etapas elegíveis",
};

export default async function ScoringAdminPage() {
  const sets = await prisma.scoringRuleSet.findMany({ where: { code: "MVP_2026" }, orderBy: { version: "desc" }, include: { rules: { orderBy: { code: "asc" } } } });
  const current = sets.find(({ active }) => active) ?? sets[0];
  const rules = new Map(current?.rules.map(({ code, points }) => [code, points]) ?? []);
  return <main className="mx-auto max-w-5xl px-5 py-8"><p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Administração</p><h1 className="mt-1 text-3xl font-black text-brand-navy">Regras de pontuação</h1><p className="mt-2 text-slate-600">Nunca se altera uma versão usada: cada gravação cria uma nova versão auditável.</p><Card className="mt-6"><form action={createScoringRuleVersionAction} className="grid gap-4 sm:grid-cols-2">{Object.entries(labels).map(([code, label]) => <label key={code} className="grid gap-2 text-sm font-bold">{label}<input name={code} type="number" min="0" max="5000" defaultValue={rules.get(code) ?? 0} className="min-h-11 rounded-xl border border-slate-300 px-3" /></label>)}<div className="sm:col-span-2"><button className="rounded-xl bg-brand-red px-5 py-3 font-black text-white">Criar nova versão</button></div></form></Card><Card className="mt-6"><h2 className="text-xl font-black text-brand-navy">Histórico</h2><div className="mt-4 grid gap-3">{sets.map((set) => <div key={set.id} className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-3"><div><p className="font-black">Versão {set.version} · {set.name}</p><p className="text-xs text-slate-500">{set.createdAt.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${set.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-100"}`}>{set.active ? "ATIVA" : "ARQUIVO"}</span></div>)}</div></Card></main>;
}
