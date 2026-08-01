"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button } from "@desafio/ui";
import { createManualResultAction, type ResultActionState } from "../actions";

const initialState: ResultActionState = { ok: false };

export function ManualResultForm({ stageId, classId, marketId }: { stageId: string; classId: string; marketId: string }) {
  const [state, action, pending] = useActionState(createManualResultAction, initialState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="stageId" value={stageId} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="marketId" value={marketId} />
      <label className="grid gap-2 text-sm font-bold">Estado do resultado<select name="resultStatus" defaultValue="PROVISIONAL" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"><option value="PROVISIONAL">Provisório</option><option value="OFFICIAL">Oficial</option></select></label>
      <label className="grid gap-2 text-sm font-bold">Linhas de resultado<textarea name="rows" required rows={9} placeholder={'1|10|CLASSIFIED\n2|6|CLASSIFIED\n|20|DNF'} className="rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm" /><span className="text-xs font-normal text-slate-500">Formato: posição | número de barco | estado. Para DNF/DNS/etc., deixa a posição vazia.</span></label>
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "A preparar…" : "Criar importação manual"}</Button>
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}{state.importId ? <> <Link href={`/admin/importacoes/${state.importId}`} className="font-black underline">Abrir revisão</Link></> : null}</Alert> : null}
    </form>
  );
}
