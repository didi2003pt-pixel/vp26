"use client";

import { useActionState } from "react";
import { Alert, Button, Field, SelectField } from "@desafio/ui";
import { updateProfileAction, type ProfileActionState } from "./actions";

const initialState: ProfileActionState = { ok: false };

export function ProfileForm({
  profile,
  cities,
}: {
  profile: { name: string; nickname: string; countryCode: string; cityId: string | null };
  cities: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <Field label="Nome" name="name" defaultValue={profile.name} required error={state.fields?.name} />
      <Field label="Nickname público" name="nickname" defaultValue={profile.nickname} required error={state.fields?.nickname} />
      <SelectField
        label="Cidade"
        name="cityId"
        options={cities.map(({ id, name }) => ({ value: id, label: name }))}
        defaultValue={profile.cityId ?? ""}
        error={state.fields?.cityId}
        placeholder="Sem cidade selecionada"
      />
      <input type="hidden" name="countryCode" value={profile.countryCode} />
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "A guardar…" : "Guardar perfil"}</Button>
    </form>
  );
}
