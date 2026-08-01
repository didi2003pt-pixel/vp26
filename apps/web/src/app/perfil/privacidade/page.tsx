import Link from "next/link";
import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/authorization";
import {
  requestAccessAction,
  requestErasureAction,
  updateMarketingConsentAction,
} from "./actions";

export const metadata = { title: "Privacidade e dados pessoais" };

export default async function PrivacyCenterPage() {
  const user = await requireUser();
  const [requests, latestMarketingConsent] = await Promise.all([
    prisma.dataSubjectRequest.findMany({
      where: { userId: user.id },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
    prisma.consent.findFirst({
      where: { userId: user.id, type: "MARKETING_EMAIL" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-brand-red">
          Centro de privacidade
        </p>
        <h1 className="mt-2 text-4xl font-black text-brand-navy">Os teus dados</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Consulta os dados guardados, gere comunicações e apresenta pedidos de acesso ou
          apagamento. O apagamento não é imediato: a organização tem de confirmar identidade,
          obrigações legais, prémios e registos competitivos que necessitem de anonimização.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-black text-brand-navy">Exportar dados</h2>
            <p className="mt-2 text-sm text-slate-600">
              O ficheiro exclui hashes de palavras-passe, tokens, segredos e dados de terceiros.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                className="rounded-xl bg-brand-blue px-4 py-3 font-black text-white"
                href="/api/privacy/export"
              >
                Descarregar JSON
              </a>
              <form action={requestAccessAction}>
                <button className="rounded-xl border border-brand-blue px-4 py-3 font-black text-brand-blue">
                  Registar pedido de acesso
                </button>
              </form>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-brand-navy">Comunicações de marketing</h2>
            <p className="mt-2 text-sm text-slate-600">
              Estado atual: {latestMarketingConsent?.granted ? "autorizadas" : "não autorizadas"}.
            </p>
            <div className="mt-5 flex gap-3">
              <form action={updateMarketingConsentAction}>
                <input type="hidden" name="granted" value="true" />
                <button className="rounded-xl bg-brand-navy px-4 py-3 font-black text-white">
                  Autorizar
                </button>
              </form>
              <form action={updateMarketingConsentAction}>
                <input type="hidden" name="granted" value="false" />
                <button className="rounded-xl border border-slate-300 px-4 py-3 font-black">
                  Retirar
                </button>
              </form>
            </div>
          </Card>

          <Card className="md:col-span-2">
            <h2 className="text-xl font-black text-brand-navy">Pedir apagamento</h2>
            <p className="mt-2 text-sm text-slate-600">
              A estratégia prevista remove identificadores diretos e mantém registos competitivos
              sob um nickname anonimizado quando exista fundamento para os conservar.
            </p>
            <form action={requestErasureAction} className="mt-5 flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm font-bold">
                Escreve APAGAR
                <input
                  className="rounded-xl border border-slate-300 px-3 py-2"
                  name="confirmation"
                  autoComplete="off"
                  required
                />
              </label>
              <button className="rounded-xl bg-brand-red px-4 py-3 font-black text-white">
                Apresentar pedido
              </button>
            </form>
          </Card>
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-black text-brand-navy">Pedidos apresentados</h2>
          <div className="mt-4 grid gap-3">
            {requests.map((request) => (
              <Card key={request.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <strong>{request.type}</strong>
                  <span>{request.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Recebido em {request.receivedAt.toLocaleString("pt-PT")} · prazo operacional{" "}
                  {request.dueAt.toLocaleDateString("pt-PT")}
                </p>
              </Card>
            ))}
            {requests.length === 0 ? <p>Ainda não existem pedidos.</p> : null}
          </div>
        </section>

        <p className="mt-8 text-sm">
          <Link className="font-black text-brand-blue" href="/privacidade">
            Política de privacidade →
          </Link>
        </p>
      </main>
    </>
  );
}
