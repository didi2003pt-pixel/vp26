import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";
import { requireRole } from "@/lib/authorization";
import { anonymizeRequestAction } from "./actions";

export default async function AdminPrivacyPage() {
  await requireRole("SUPERADMIN");
  const [requests, retentionRuns, securityEvents] = await Promise.all([
    prisma.dataSubjectRequest.findMany({
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 100,
      include: { user: { select: { email: true, profile: { select: { nickname: true } } } } },
    }),
    prisma.retentionRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">
        Fase 5 · RGPD e segurança
      </p>
      <h1 className="mt-1 text-3xl font-black text-brand-navy">Privacidade operacional</h1>

      <section className="mt-7">
        <h2 className="text-xl font-black">Pedidos de titulares</h2>
        <div className="mt-4 grid gap-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <strong>{request.type}</strong> · {request.status}
                  <p className="text-sm text-slate-600">
                    {request.user?.profile?.nickname ?? "Conta não associada"} · prazo{" "}
                    {request.dueAt.toLocaleDateString("pt-PT")}
                  </p>
                </div>
                {request.type === "ERASURE" && request.status !== "COMPLETED" ? (
                  <form action={anonymizeRequestAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input
                      className="rounded-lg border px-3 py-2 text-sm"
                      name="confirmation"
                      placeholder={`ANONIMIZAR:${request.id}`}
                      required
                    />
                    <button className="rounded-lg bg-brand-red px-3 py-2 font-black text-white">
                      Anonimizar
                    </button>
                  </form>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-black">Execuções de retenção</h2>
          <div className="mt-4 grid gap-3">
            {retentionRuns.map((run) => (
              <Card key={run.id}>
                <strong>{run.status}</strong>
                <p className="text-sm">{run.startedAt.toLocaleString("pt-PT")}</p>
              </Card>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-xl font-black">Eventos de segurança</h2>
          <div className="mt-4 grid gap-3">
            {securityEvents.map((event) => (
              <Card key={event.id}>
                <strong>{event.severity} · {event.eventType}</strong>
                <p className="text-sm">{event.createdAt.toLocaleString("pt-PT")}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
