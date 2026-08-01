import Link from "next/link";
import { Alert, Card } from "@desafio/ui";
import { SiteHeader } from "@/components/site-header";
import { StageStatusBadge } from "@/components/stage-status-badge";
import { formatDateTime } from "@/lib/game/format";
import { getFeatureFlags, getGameLaunchStage } from "@/lib/game/flags";
import { listStagesWithMarkets } from "@/lib/game/queries";
import { getCurrentSession } from "@/lib/session";

export const metadata = { title: "Jogar" };

export default async function PlayPage() {
  const [stages, flags, session, launchStage] = await Promise.all([
    listStagesWithMarkets(),
    getFeatureFlags("public_game_enabled", "predictions_enabled"),
    getCurrentSession(),
    getGameLaunchStage(),
  ]);
  const markets = stages.flatMap((stage) => stage.predictionMarkets.map((market) => ({ stage, market })));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Desafio Volta à Vela</p>
        <h1 className="mt-2 text-4xl font-black text-brand-navy">Faz a tua previsão</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Escolhe uma etapa e uma classe. O sistema só aceita alterações dentro da janela configurada pela organização.</p>

        {!flags.public_game_enabled || !flags.predictions_enabled ? (
          <Alert tone="warning" className="mt-6">
            O jogo está tecnicamente preparado, mas a abertura pública ainda depende das feature flags da organização.
          </Alert>
        ) : null}
        {!session ? <Alert tone="info" className="mt-4">Tens de <Link href="/login" className="font-black underline">entrar na tua conta</Link> para submeter previsões.</Alert> : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {markets.map(({ stage, market }) => {
            const beforeLaunch = launchStage !== null && stage.number < launchStage;
            return (
            <Card key={market.id} className={beforeLaunch ? "opacity-70" : ""}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-brand-red">Etapa {String(stage.number).padStart(2, "0")}</p>
                  <h2 className="mt-1 text-xl font-black text-brand-navy">{stage.name}</h2>
                  <p className="mt-2 font-bold">Classe {market.class.code}</p>
                </div>
                <StageStatusBadge status={market.status} />
              </div>
              <p className="mt-4 text-sm text-slate-500">Fecho: {formatDateTime(market.closesAt)}</p>
              {beforeLaunch ? <p className="mt-5 text-sm font-bold text-slate-500">Arquivo anterior ao lançamento</p> : <Link href={`/jogar/${stage.slug}/${market.class.code.toLowerCase()}`} className="mt-5 inline-flex rounded-xl bg-brand-navy px-5 py-3 font-black text-white">Abrir previsão</Link>}
            </Card>
          )})}
        </div>
      </main>
    </>
  );
}
