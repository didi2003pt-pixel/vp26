import Link from "next/link";
import { Card } from "@desafio/ui";
import { SiteHeader } from "@/components/site-header";
import { listBoats } from "@/lib/game/queries";

export const metadata = { title: "Embarcações" };

export default async function BoatsPage() {
  const boats = await listBoats();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-brand-red">Frota 2026</p>
        <h1 className="mt-2 text-4xl font-black text-brand-navy">Embarcações</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Número de barco confirmado no Excel e número de vela proveniente dos certificados ANC ou ORC.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boats.map((boat) => {
            const sail = boat.identifiers.find((identifier) => identifier.type === "SAIL_NUMBER")?.value ?? "Por validar";
            const rootClass = boat.class.parent?.code ?? boat.class.code;
            return (
              <Link key={boat.id} href={`/embarcacoes/${boat.boatNumber}`}>
                <Card className="h-full transition hover:-translate-y-1 hover:border-brand-blue hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-12 place-items-center rounded-xl bg-brand-navy text-xl font-black text-white">{boat.boatNumber}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{rootClass}{boat.class.parent ? ` · ${boat.class.code}` : ""}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-black text-brand-navy">{boat.publicName}</h2>
                  <p className="mt-2 text-sm text-slate-500">{sail}</p>
                  <p className="mt-1 text-sm text-slate-500">{boat.certificates[0]?.model ?? "Modelo por validar"}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
