"use client";

import { useActionState } from "react";
import { Alert, Button, Field, SelectField } from "@desafio/ui";
import { submitPredictionAction, type PredictionActionState } from "../../actions";

const initialState: PredictionActionState = { ok: false };

type BoatOption = {
  id: string;
  label: string;
  surpriseEligible: boolean;
};

type Question = {
  type: "SINGLE_CHOICE" | "TRUE_FALSE" | "EXACT_NUMBER" | "NUMERIC_RANGE" | "TIME_DIFFERENCE" | "TIME_RANGE";
  prompt: string;
  helpText: string | null;
  options: Array<{ value: string; label: string }>;
};

export function PredictionForm({
  marketId,
  boats,
  allowSurpriseInPodium,
  question,
  defaults,
  canSubmit,
}: {
  marketId: string;
  boats: BoatOption[];
  allowSurpriseInPodium: boolean;
  question: Question | null;
  defaults: {
    winnerBoatId: string;
    secondBoatId: string;
    thirdBoatId: string;
    surpriseBoatId: string;
    specialAnswer: string;
  };
  canSubmit: boolean;
}) {
  const [state, action, pending] = useActionState(submitPredictionAction, initialState);
  const options = boats.map(({ id, label }) => ({ value: id, label }));
  const surpriseOptions = boats
    .filter(({ surpriseEligible }) => surpriseEligible)
    .map(({ id, label }) => ({ value: id, label }));

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="marketId" value={marketId} />

      <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-5">
        <legend className="px-2 text-lg font-black text-brand-navy">1 · O teu pódio</legend>
        <SelectField
          label="Vencedor"
          name="winnerBoatId"
          options={options}
          defaultValue={defaults.winnerBoatId}
          required
          error={state.fields?.winnerBoatId ?? state.fields?.podium ?? state.fields?.podium_1}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Segundo lugar"
            name="secondBoatId"
            options={options}
            defaultValue={defaults.secondBoatId}
            required
            error={state.fields?.secondBoatId ?? state.fields?.podium_2}
          />
          <SelectField
            label="Terceiro lugar"
            name="thirdBoatId"
            options={options}
            defaultValue={defaults.thirdBoatId}
            required
            error={state.fields?.thirdBoatId ?? state.fields?.podium_3}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-5">
        <legend className="px-2 text-lg font-black text-brand-navy">2 · Embarcação surpresa</legend>
        <SelectField
          label="Escolhe uma outsider elegível"
          name="surpriseBoatId"
          options={surpriseOptions}
          defaultValue={defaults.surpriseBoatId}
          required
          error={state.fields?.surpriseBoatId}
        />
        <p className="text-sm text-slate-500">
          {allowSurpriseInPodium
            ? "Nesta etapa, a surpresa pode coincidir com uma escolha do pódio."
            : "A surpresa não pode repetir uma escolha do pódio."}
        </p>
        {surpriseOptions.length === 0 ? <Alert tone="warning">A organização ainda não marcou embarcações elegíveis como surpresa.</Alert> : null}
      </fieldset>

      {question ? (
        <fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-5">
          <legend className="px-2 text-lg font-black text-brand-navy">3 · Pergunta especial</legend>
          <p className="font-bold">{question.prompt}</p>
          {question.helpText ? <p className="text-sm text-slate-500">{question.helpText}</p> : null}
          <SpecialAnswerField question={question} defaultValue={defaults.specialAnswer} error={state.fields?.specialAnswer} />
        </fieldset>
      ) : null}

      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending || !canSubmit || surpriseOptions.length === 0}>
        {pending ? "A guardar…" : defaults.winnerBoatId ? "Atualizar previsão" : "Confirmar previsão"}
      </Button>
      <p className="text-xs text-slate-500">O prazo é controlado pelo servidor. Depois do fecho, a previsão fica bloqueada.</p>
    </form>
  );
}

function SpecialAnswerField({ question, defaultValue, error }: { question: Question; defaultValue: string; error?: string }) {
  if (["SINGLE_CHOICE", "NUMERIC_RANGE", "TIME_RANGE"].includes(question.type)) {
    return (
      <SelectField
        label="Resposta"
        name="specialAnswer"
        options={question.options}
        defaultValue={defaultValue}
        required
        error={error}
      />
    );
  }

  if (question.type === "TRUE_FALSE") {
    return (
      <SelectField
        label="Resposta"
        name="specialAnswer"
        options={[{ value: "true", label: "Verdadeiro" }, { value: "false", label: "Falso" }]}
        defaultValue={defaultValue}
        required
        error={error}
      />
    );
  }

  return (
    <Field
      label={question.type === "TIME_DIFFERENCE" ? "Diferença prevista (MM:SS ou HH:MM:SS)" : "Resposta numérica"}
      name="specialAnswer"
      inputMode={question.type === "TIME_DIFFERENCE" ? "text" : "decimal"}
      defaultValue={defaultValue}
      required
      error={error}
    />
  );
}
