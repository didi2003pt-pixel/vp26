"use client";

import { useActionState } from "react";
import { Button, Field } from "@desafio/ui";
import { registerAction, type FormState } from "../actions";

const initialState: FormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <Field label="Nome" name="name" autoComplete="name" required error={state.fields?.name?.[0]} />
      <Field label="Nickname público" name="nickname" autoComplete="nickname" required error={state.fields?.nickname?.[0]} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fields?.email?.[0]} />
      <Field label="Cidade" name="city" autoComplete="address-level2" required error={state.fields?.city?.[0]} />
      <input type="hidden" name="country" value="PT" />
      <Field label="Palavra-passe" name="password" type="password" autoComplete="new-password" required error={state.fields?.password?.[0]} />
      <label className="flex gap-3 text-sm"><input className="mt-1 size-4" type="checkbox" name="acceptTerms" required />Aceito os termos e condições.</label>
      <label className="flex gap-3 text-sm"><input className="mt-1 size-4" type="checkbox" name="acceptPrivacy" required />Li e aceito a política de privacidade.</label>
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "A criar conta…" : "Criar conta"}</Button>
    </form>
  );
}
