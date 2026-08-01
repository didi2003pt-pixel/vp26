"use client";

import { useActionState } from "react";
import { Button, Field } from "@desafio/ui";
import { loginAction, type FormState } from "../actions";

const initialState: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Palavra-passe" name="password" type="password" autoComplete="current-password" required />
      {state.message ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "A entrar…" : "Entrar"}</Button>
    </form>
  );
}
