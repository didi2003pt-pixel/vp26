import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { toDateTimeLocal } from "@/lib/game/format";
import { MarketForm, SpecialQuestionForm, StageForm, SurpriseEligibilityForm } from "../admin-forms";

export default async function AdminStageDetailPage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      predictionMarkets: {
        orderBy: { class: { code: "asc" } },
        include: {
          class: true,
          specialQuestion: { include: { options: { orderBy: { sortOrder: "asc" } } } },
          _count: { select: { predictions: true } },
        },
      },
      stageBoats: {
        where: { eligibleForPrediction: true },
        include: { boat: { include: { class: { include: { parent: true } } } } },
        orderBy: { boat: { publicName: "asc" } },
      },
    },
  });
  if (!stage) notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <Link href="/admin/etapas" className="text-sm font-bold text-brand-blue">← Etapas</Link>
      <h1 className="mt-4 text-3xl font-black text-brand-navy">Etapa {stage.number} · {stage.name}</h1>

      <Card className="mt-6">
        <h2 className="text-xl font-black text-brand-navy">Estado geral</h2>
        <div className="mt-5 max-w-xl"><StageForm stage={{ id: stage.id, status: stage.status, scheduledStartAt: toDateTimeLocal(stage.scheduledStartAt) }} /></div>
      </Card>

      <div className="mt-6 grid gap-6">
        {stage.predictionMarkets.map((market) => {
          const classBoats = stage.stageBoats.filter(({ boat }) => {
            const root = boat.class.parent?.code ?? boat.class.code;
            return root === market.class.code;
          });
          const question = market.specialQuestion;
          return (
            <Card key={market.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-sm font-black text-brand-red">Mercado</p><h2 className="mt-1 text-2xl font-black text-brand-navy">Classe {market.class.code}</h2></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{market._count.predictions} previsões</span>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <section className="rounded-2xl bg-slate-50 p-5">
                  <h3 className="font-black text-brand-navy">Janela de previsões</h3>
                  <div className="mt-4"><MarketForm market={{ id: market.id, status: market.status, opensAt: toDateTimeLocal(market.opensAt), closesAt: toDateTimeLocal(market.closesAt), allowSurpriseInPodium: market.allowSurpriseInPodium }} /></div>
                </section>

                <section className="rounded-2xl bg-slate-50 p-5">
                  <h3 className="font-black text-brand-navy">Pergunta especial</h3>
                  <div className="mt-4"><SpecialQuestionForm marketId={market.id} question={{
                    type: question?.type ?? "SINGLE_CHOICE",
                    prompt: question?.prompt ?? "",
                    helpText: question?.helpText ?? "",
                    points: question?.points ?? 50,
                    active: question?.active ?? false,
                    options: question?.options.map(({ value, label }) => `${value}|${label}`).join("\n") ?? "",
                  }} /></div>
                </section>
              </div>

              <section className="mt-6 rounded-2xl border border-slate-200 p-5">
                <h3 className="font-black text-brand-navy">Embarcações surpresa elegíveis</h3>
                <p className="mt-2 text-sm text-slate-500">Esta escolha é editorial. Não é deduzida de resultados históricos.</p>
                <SurpriseEligibilityForm
                  marketId={market.id}
                  boats={classBoats.map(({ boat, surpriseEligible }) => ({
                    id: boat.id,
                    boatNumber: boat.boatNumber,
                    publicName: boat.publicName,
                    surpriseEligible,
                  }))}
                />
              </section>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
