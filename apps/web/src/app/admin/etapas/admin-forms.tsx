"use client";

import { useActionState } from "react";
import { Alert, Button, Field, SelectField } from "@desafio/ui";
import {
  updateMarketAction,
  updateStageAction,
  updateSurpriseEligibilityAction,
  upsertSpecialQuestionAction,
  type AdminActionState,
} from "./actions";

const initialState: AdminActionState = { ok: false };

export function StageForm({ stage }: { stage: { id: string; status: string; scheduledStartAt: string } }) {
  const [state, action, pending] = useActionState(updateStageAction, initialState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="stageId" value={stage.id} />
      <SelectField label="Estado da etapa" name="status" defaultValue={stage.status} options={[
        ["DRAFT", "Rascunho"], ["SCHEDULED", "Prevista"], ["PREDICTIONS_OPEN", "Previsões abertas"],
        ["PREDICTIONS_CLOSED", "Previsões fechadas"], ["IN_PROGRESS", "Em curso"],
        ["PROVISIONAL_RESULTS", "Resultados provisórios"], ["OFFICIAL_RESULTS", "Resultados oficiais"],
        ["POSTPONED", "Adiada"], ["CANCELLED", "Cancelada"], ["ARCHIVED", "Arquivada"],
      ].map(([value, label]) => ({ value, label }))} />
      <Field label="Partida prevista — hora de Lisboa" name="scheduledStartAt" type="datetime-local" defaultValue={stage.scheduledStartAt} />
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "A guardar…" : "Guardar etapa"}</Button>
    </form>
  );
}

export function MarketForm({ market }: { market: { id: string; status: string; opensAt: string; closesAt: string; allowSurpriseInPodium: boolean } }) {
  const [state, action, pending] = useActionState(updateMarketAction, initialState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="marketId" value={market.id} />
      <SelectField label="Estado do mercado" name="status" defaultValue={market.status} options={[
        ["DRAFT", "Rascunho"], ["OPEN", "Aberto"], ["CLOSED", "Fechado"], ["CANCELLED", "Cancelado"], ["ARCHIVED", "Arquivado"],
      ].map(([value, label]) => ({ value, label }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Abertura — Lisboa" name="opensAt" type="datetime-local" defaultValue={market.opensAt} />
        <Field label="Fecho — Lisboa" name="closesAt" type="datetime-local" defaultValue={market.closesAt} />
      </div>
      <label className="flex gap-3 text-sm"><input type="checkbox" name="allowSurpriseInPodium" defaultChecked={market.allowSurpriseInPodium} />Permitir que a surpresa repita uma escolha do pódio.</label>
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "A guardar…" : "Guardar mercado"}</Button>
    </form>
  );
}

export function SpecialQuestionForm({ question, marketId }: {
  marketId: string;
  question: { type: string; prompt: string; helpText: string; points: number; active: boolean; options: string };
}) {
  const [state, action, pending] = useActionState(upsertSpecialQuestionAction, initialState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="marketId" value={marketId} />
      <SelectField label="Tipo" name="type" defaultValue={question.type} options={[
        ["SINGLE_CHOICE", "Escolha única"], ["TRUE_FALSE", "Verdadeiro ou falso"],
        ["EXACT_NUMBER", "Número exato"], ["NUMERIC_RANGE", "Intervalo numérico"],
        ["TIME_DIFFERENCE", "Diferença de tempo"], ["TIME_RANGE", "Intervalo de tempo"],
      ].map(([value, label]) => ({ value, label }))} />
      <Field label="Pergunta" name="prompt" defaultValue={question.prompt} required />
      <Field label="Ajuda opcional" name="helpText" defaultValue={question.helpText} />
      <Field label="Pontos" name="points" type="number" min="0" max="500" defaultValue={question.points} required />
      <label className="grid gap-2 text-sm font-semibold text-slate-800">
        Opções — uma por linha no formato valor|texto
        <textarea name="options" defaultValue={question.options} rows={5} className="rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm" />
      </label>
      <label className="flex gap-3 text-sm"><input type="checkbox" name="active" defaultChecked={question.active} />Pergunta ativa.</label>
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "A guardar…" : "Guardar pergunta"}</Button>
    </form>
  );
}


export function SurpriseEligibilityForm({
  marketId,
  boats,
}: {
  marketId: string;
  boats: Array<{ id: string; boatNumber: string; publicName: string; surpriseEligible: boolean }>;
}) {
  const [state, action, pending] = useActionState(updateSurpriseEligibilityAction, initialState);
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="marketId" value={marketId} />
      {boats.map((boat) => (
        <label key={boat.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold">
          <input type="checkbox" name="surpriseBoatId" value={boat.id} defaultChecked={boat.surpriseEligible} />
          <span>#{boat.boatNumber} · {boat.publicName}</span>
        </label>
      ))}
      {state.message ? (
        <Alert tone={state.ok ? "success" : "danger"} className="sm:col-span-2 lg:col-span-3">{state.message}</Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="sm:col-span-2 lg:col-span-3">
        {pending ? "A guardar…" : "Guardar elegibilidade"}
      </Button>
    </form>
  );
}
