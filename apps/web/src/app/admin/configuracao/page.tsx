import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { toggleFeatureFlagAction, updateGameLaunchStageAction } from "./actions";

export default async function AdminConfigurationPage() {
  const [flags, stages, launchSetting] = await Promise.all([
    prisma.featureFlag.findMany({ orderBy: { key: "asc" } }),
    prisma.stage.findMany({ orderBy: { number: "asc" }, select: { number: true, name: true } }),
    prisma.systemSetting.findUnique({ where: { key: "game_launch_stage" }, select: { value: true } }),
  ]);
  const launchValue = launchSetting?.value;
  const launchStage = launchValue && typeof launchValue === "object" && !Array.isArray(launchValue)
    ? (launchValue as { stage?: unknown }).stage
    : null;
  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="text-3xl font-black text-brand-navy">Configuração</h1>
      <p className="mt-2 text-slate-600">As flags protegem o lançamento público. Ativa-as apenas depois de configurar horários, perguntas e outsiders.</p>
      <Card className="mt-6">
        <h2 className="text-xl font-black text-brand-navy">Lançamento competitivo</h2>
        <p className="mt-2 text-sm text-slate-500">As etapas anteriores ficam em arquivo e nunca aceitam previsões retroativas.</p>
        <form action={updateGameLaunchStageAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid min-w-72 gap-2 text-sm font-bold">
            Primeira etapa elegível
            <select name="stage" defaultValue={typeof launchStage === "number" ? String(launchStage) : ""} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="">Por definir</option>
              {stages.map((stage) => <option key={stage.number} value={stage.number}>Etapa {stage.number} · {stage.name}</option>)}
            </select>
          </label>
          <button className="min-h-11 rounded-xl bg-brand-navy px-5 py-2.5 font-black text-white">Guardar lançamento</button>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="text-xl font-black text-brand-navy">Feature flags</h2>
        <div className="mt-4 grid gap-3">
          {flags.map((flag) => (
            <div key={flag.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
              <div><p className="font-black text-brand-navy">{flag.key}</p><p className="text-sm text-slate-500">{flag.description ?? "Sem descrição"}</p></div>
              <form action={toggleFeatureFlagAction}>
                <input type="hidden" name="key" value={flag.key} />
                <input type="hidden" name="enabled" value={flag.enabled ? "false" : "true"} />
                <button className={`rounded-xl px-4 py-2 text-sm font-black ${flag.enabled ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>
                  {flag.enabled ? "Ativa · desativar" : "Desativada · ativar"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
