import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { confirmImportAction, resolveImportRowAction, setImportSpecialAnswerAction } from "../../resultados/actions";

function normalizedValue(value: unknown, key: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "—";
  const result = (value as Record<string, unknown>)[key];
  return result == null ? "—" : String(result);
}

function specialAnswerDisplay(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Ainda não definida";
  const parsed = value as Record<string, unknown>;
  const answer = parsed.specialAnswer;
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return "Ainda não definida";
  const answerValue = (answer as Record<string, unknown>).value;
  return answerValue == null ? "Ainda não definida" : String(answerValue);
}

export default async function AdminImportPage({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  const resultImport = await prisma.resultImport.findUnique({
    where: { id: importId },
    include: { stage: true, class: true, rows: { orderBy: { rowNumber: "asc" }, include: { boat: true } }, result: true },
  });
  if (!resultImport || !resultImport.stage || !resultImport.class) notFound();
  const market = await prisma.predictionMarket.findUniqueOrThrow({
    where: { stageId_classId: { stageId: resultImport.stage.id, classId: resultImport.class.id } },
    include: { specialQuestion: { include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } },
  });
  const eligible = await prisma.stageBoat.findMany({
    where: { stageId: resultImport.stage.id, boat: { OR: [{ classId: resultImport.class.id }, { class: { parentId: resultImport.class.id } }] } },
    include: { boat: true },
    orderBy: { boat: { publicName: "asc" } },
  });
  const unresolved = resultImport.rows.filter(({ status }) => !["MATCHED", "IGNORED"].includes(status)).length;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <Link href={`/admin/resultados/${market.id}`} className="font-bold text-brand-blue">← Resultado da etapa</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-black text-brand-red">Etapa {resultImport.stage.number} · {resultImport.class.code}</p><h1 className="mt-1 text-3xl font-black text-brand-navy">Revisão da importação</h1><p className="mt-2 text-sm text-slate-500">{resultImport.sourceName} · SHA-256 {resultImport.sourceHash.slice(0, 16)}…</p></div>
        <Badge tone={resultImport.status === "READY" || resultImport.status === "CONFIRMED" ? "success" : "warning"}>{resultImport.status}</Badge>
      </div>
      {unresolved ? <Alert tone="warning" className="mt-6">Existem {unresolved} linhas por resolver. Não é possível confirmar o resultado.</Alert> : null}
      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-brand-navy text-white"><tr><th className="p-3">Linha</th><th className="p-3">Posição</th><th className="p-3">Vela</th><th className="p-3">Nome externo</th><th className="p-3">Estado</th><th className="p-3">Correspondência</th><th className="p-3">Ação</th></tr></thead>
          <tbody>{resultImport.rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 align-top">
              <td className="p-3 font-black">{row.rowNumber}</td>
              <td className="p-3">{normalizedValue(row.normalized, "position")}</td>
              <td className="p-3">{normalizedValue(row.normalized, "sailNumber")}</td>
              <td className="p-3">{normalizedValue(row.normalized, "boatName")}</td>
              <td className="p-3"><Badge tone={row.status === "MATCHED" ? "success" : row.status === "IGNORED" ? "neutral" : "warning"}>{row.status}</Badge><p className="mt-1 text-xs text-slate-500">{row.matchReason}</p></td>
              <td className="p-3 font-bold">{row.boat ? `#${row.boat.boatNumber} · ${row.boat.publicName}` : "Por resolver"}</td>
              <td className="p-3">
                <form action={resolveImportRowAction} className="flex min-w-[330px] gap-2">
                  <input type="hidden" name="rowId" value={row.id} /><input type="hidden" name="importId" value={resultImport.id} />
                  <select name="boatId" defaultValue={row.boatId ?? ""} className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-2"><option value="">Selecionar…</option>{eligible.map(({ boat }) => <option key={boat.id} value={boat.id}>#{boat.boatNumber} · {boat.publicName}</option>)}</select>
                  <button className="rounded-lg bg-brand-navy px-3 py-2 font-black text-white">Guardar</button>
                </form>
                <form action={resolveImportRowAction} className="mt-2"><input type="hidden" name="rowId" value={row.id} /><input type="hidden" name="importId" value={resultImport.id} /><input type="hidden" name="ignored" value="true" /><button className="text-xs font-bold text-slate-500 underline">Ignorar linha</button></form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      {resultImport.status !== "CONFIRMED" && market.specialQuestion?.active ? (
        <Card className="mt-6">
          <h2 className="text-xl font-black text-brand-navy">Resposta oficial da pergunta especial</h2>
          <p className="mt-2 font-bold text-slate-700">{market.specialQuestion.prompt}</p>
          <p className="mt-1 text-sm text-slate-500">Guarda a resposta antes de confirmar o resultado. Será usada pelo motor de pontuação.</p>
          <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm"><strong>Resposta guardada:</strong> {specialAnswerDisplay(resultImport.parsedPayload)}</p>
          <form action={setImportSpecialAnswerAction} className="mt-4 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <input type="hidden" name="importId" value={resultImport.id} />
            {market.specialQuestion.type === "SINGLE_CHOICE" || market.specialQuestion.type === "NUMERIC_RANGE" || market.specialQuestion.type === "TIME_RANGE" ? (
              <select name="specialAnswer" required className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-3">
                <option value="">Selecionar…</option>
                {market.specialQuestion.options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
              </select>
            ) : market.specialQuestion.type === "TRUE_FALSE" ? (
              <select name="specialAnswer" required className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-3">
                <option value="">Selecionar…</option><option value="true">Verdadeiro</option><option value="false">Falso</option>
              </select>
            ) : (
              <input
                name="specialAnswer"
                required
                inputMode={market.specialQuestion.type === "EXACT_NUMBER" ? "decimal" : "numeric"}
                placeholder={market.specialQuestion.type === "TIME_DIFFERENCE" ? "MM:SS ou HH:MM:SS" : "Valor numérico"}
                className="min-h-12 flex-1 rounded-xl border border-slate-300 px-3"
              />
            )}
            <button className="rounded-xl bg-brand-navy px-5 py-3 font-black text-white">Guardar resposta</button>
          </form>
        </Card>
      ) : null}
      {resultImport.status !== "CONFIRMED" ? (
        <Card className="mt-6">
          <h2 className="text-xl font-black text-brand-navy">Confirmar resultado</h2>
          <p className="mt-2 text-sm text-slate-500">A confirmação cria uma versão imutável. Correções posteriores geram uma nova versão.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={confirmImportAction}><input type="hidden" name="importId" value={resultImport.id} /><input type="hidden" name="marketId" value={market.id} /><input type="hidden" name="status" value="PROVISIONAL" /><button disabled={Boolean(unresolved)} className="rounded-xl bg-amber-500 px-5 py-3 font-black text-white disabled:opacity-50">Confirmar como provisório</button></form>
            <form action={confirmImportAction}><input type="hidden" name="importId" value={resultImport.id} /><input type="hidden" name="marketId" value={market.id} /><input type="hidden" name="status" value="OFFICIAL" /><button disabled={Boolean(unresolved)} className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-50">Confirmar como oficial</button></form>
          </div>
        </Card>
      ) : <Alert tone="success" className="mt-6">Importação confirmada como resultado versão {resultImport.result?.version}.</Alert>}
    </main>
  );
}
