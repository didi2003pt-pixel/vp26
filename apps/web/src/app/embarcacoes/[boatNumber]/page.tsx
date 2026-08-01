import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@desafio/ui";
import { SiteHeader } from "@/components/site-header";
import { getBoatByNumber } from "@/lib/game/queries";
import { formatDate } from "@/lib/game/format";

export default async function BoatDetailPage({ params }: { params: Promise<{ boatNumber: string }> }) {
  const { boatNumber } = await params;
  const boat = await getBoatByNumber(boatNumber);
  if (!boat) notFound();
  const sail = boat.identifiers.find((identifier) => identifier.type === "SAIL_NUMBER" && identifier.isCurrent)?.value ?? "Por validar";
  const certificate = boat.certificates.find((item) => item.isCurrent);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <Link href="/embarcacoes" className="text-sm font-bold text-brand-blue">← Todas as embarcações</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.65fr]">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Número de barco {boat.boatNumber}</p>
                <h1 className="mt-2 text-4xl font-black text-brand-navy">{boat.publicName}</h1>
                <p className="mt-3 text-xl font-bold text-slate-600">{sail}</p>
              </div>
              <Badge tone="info">{boat.class.parent?.code ?? boat.class.code}{boat.class.parent ? ` · ${boat.class.code}` : ""}</Badge>
            </div>
            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-500">Nome técnico</dt><dd className="mt-1 font-bold">{boat.technicalName ?? "Igual ao nome público"}</dd></div>
              <div><dt className="text-sm text-slate-500">Modelo</dt><dd className="mt-1 font-bold">{certificate?.model ?? "Por validar"}</dd></div>
              <div><dt className="text-sm text-slate-500">Certificado</dt><dd className="mt-1 font-bold">{certificate?.type ?? "Por validar"} · {certificate?.status ?? "PENDING"}</dd></div>
              <div><dt className="text-sm text-slate-500">Validade</dt><dd className="mt-1 font-bold">{certificate?.validUntil ? formatDate(certificate.validUntil) : "Por validar"}</dd></div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-xl font-black text-brand-navy">Participação prevista</h2>
            <ol className="mt-4 grid gap-2">
              {boat.stageBoats.map(({ stage }) => <li key={stage.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><strong>Etapa {stage.number}</strong> · {stage.name}</li>)}
            </ol>
          </Card>
        </div>
      </main>
    </>
  );
}
