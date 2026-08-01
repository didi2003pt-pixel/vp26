import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card } from "@desafio/ui";
import { resolveMarketAvailability } from "@desafio/game";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/authorization";
import { formatDateTime } from "@/lib/game/format";
import { getFeatureFlags, getGameLaunchStage } from "@/lib/game/flags";
import { getPredictionMarketForUser, listEligibleBoatsForMarket } from "@/lib/game/queries";
import { PredictionForm } from "./prediction-form";

function displaySpecialAnswer(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const answer = value as { type?: string; value?: unknown };
  if (answer.type === "boolean") return answer.value ? "true" : "false";
  if (answer.type === "duration_seconds" && typeof answer.value === "number") {
    const hours = Math.floor(answer.value / 3600);
    const minutes = Math.floor((answer.value % 3600) / 60);
    const seconds = answer.value % 60;
    return hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return answer.value === undefined ? "" : String(answer.value);
}

export default async function PredictionPage({
  params,
}: {
  params: Promise<{ stageSlug: string; classCode: string }>;
}) {
  const user = await requireUser();
  const { stageSlug, classCode } = await params;
  const [market, flags, launchStage] = await Promise.all([
    getPredictionMarketForUser({ stageSlug, classCode, userId: user.id }),
    getFeatureFlags("public_game_enabled", "predictions_enabled"),
    getGameLaunchStage(),
  ]);
  if (!market) notFound();
  const stageBoats = await listEligibleBoatsForMarket(market.id);
  const existing = market.predictions[0];
  const podium = new Map<number, string>((existing?.podium ?? []).map(({ position, boatId }: { position: number; boatId: string }) => [position, boatId]));
  const availability = resolveMarketAvailability({
    marketStatus: market.status,
    stageStatus: market.stage.status,
    opensAt: market.opensAt,
    closesAt: market.closesAt,
  });
  const isBeforeLaunch = launchStage !== null && market.stage.number < launchStage;
  const canSubmit = flags.public_game_enabled && flags.predictions_enabled && availability.open && !isBeforeLaunch;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <Link href="/jogar" className="text-sm font-bold text-brand-blue">← Escolher outra etapa</Link>
        <div className="mt-5">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Etapa {String(market.stage.number).padStart(2, "0")} · Classe {market.class.code}</p>
          <h1 className="mt-2 text-4xl font-black text-brand-navy">{market.stage.name}</h1>
          <p className="mt-3 text-slate-600">Fecho: <strong>{formatDateTime(market.closesAt)}</strong></p>
        </div>

        {!canSubmit ? (
          <Alert tone="warning" className="mt-6">
            {isBeforeLaunch
              ? "Esta etapa é anterior ao lançamento competitivo do jogo."
              : flags.public_game_enabled && flags.predictions_enabled
                ? availability.message
                : "A organização ainda não ativou as previsões públicas."}
          </Alert>
        ) : null}

        <Card className="mt-8">
          <PredictionForm
            marketId={market.id}
            boats={stageBoats.map(({ boat, surpriseEligible }) => ({
              id: boat.id,
              label: `#${boat.boatNumber} · ${boat.publicName} · ${boat.identifiers[0]?.value ?? "vela por validar"}`,
              surpriseEligible,
            }))}
            allowSurpriseInPodium={market.allowSurpriseInPodium}
            question={market.specialQuestion?.active ? {
              type: market.specialQuestion.type,
              prompt: market.specialQuestion.prompt,
              helpText: market.specialQuestion.helpText,
              options: market.specialQuestion.options.map(({ value, label }) => ({ value, label })),
            } : null}
            defaults={{
              winnerBoatId: podium.get(1) ?? "",
              secondBoatId: podium.get(2) ?? "",
              thirdBoatId: podium.get(3) ?? "",
              surpriseBoatId: existing?.surpriseBoatId ?? "",
              specialAnswer: displaySpecialAnswer(existing?.specialAnswer),
            }}
            canSubmit={canSubmit}
          />
        </Card>
      </main>
    </>
  );
}
