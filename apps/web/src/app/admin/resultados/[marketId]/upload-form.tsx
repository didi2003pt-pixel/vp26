"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button } from "@desafio/ui";
import { uploadResultAction, type ResultActionState } from "../actions";

const initialState: ResultActionState = { ok: false };

export function UploadResultForm({ stageId, classId, marketId }: { stageId: string; classId: string; marketId: string }) {
  const [state, action, pending] = useActionState(uploadResultAction, initialState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="stageId" value={stageId} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="marketId" value={marketId} />
      <label className="grid gap-2 text-sm font-bold">
        Formato
        <select name="format" defaultValue="CSV" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2">
          <option value="CSV">CSV oficial/exportado</option>
          <option value="JSON">JSON normalizado</option>
          <option value="XRR_XML">World Sailing XRR/XML</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Ficheiro de resultados
        <input name="file" type="file" accept=".csv,.json,.xml,text/csv,application/json,application/xml,text/xml" required className="rounded-xl border border-slate-300 bg-white p-3" />
      </label>
      <Button type="submit" disabled={pending}>{pending ? "A analisar…" : "Analisar ficheiro"}</Button>
      {state.message ? <Alert tone={state.ok ? "success" : "danger"}>{state.message}{state.importId ? <> <Link className="font-black underline" href={`/admin/importacoes/${state.importId}`}>Abrir revisão</Link></> : null}</Alert> : null}
    </form>
  );
}
