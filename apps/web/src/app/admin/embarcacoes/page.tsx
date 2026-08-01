import { Card } from "@desafio/ui";
import { prisma } from "@desafio/database";

export default async function AdminBoatsPage() {
  const boats = await prisma.boat.findMany({
    orderBy: { publicName: "asc" },
    include: {
      class: { include: { parent: true } },
      identifiers: { where: { type: "SAIL_NUMBER", isCurrent: true }, take: 1 },
      certificates: { where: { isCurrent: true }, take: 1 },
      _count: { select: { stageBoats: true } },
    },
  });
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <h1 className="text-3xl font-black text-brand-navy">Embarcações</h1>
      <p className="mt-2 text-slate-600">Consulta administrativa. Os identificadores oficiais não são alterados nesta fase.</p>
      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-brand-navy text-white"><tr><th className="p-3">Nº</th><th className="p-3">Nome</th><th className="p-3">Classe</th><th className="p-3">Vela</th><th className="p-3">Certificado</th><th className="p-3">Etapas</th></tr></thead>
          <tbody>{boats.map((boat) => <tr key={boat.id} className="border-b border-slate-100"><td className="p-3 font-black">{boat.boatNumber}</td><td className="p-3 font-bold">{boat.publicName}</td><td className="p-3">{boat.class.parent?.code ?? boat.class.code}{boat.class.parent ? ` / ${boat.class.code}` : ""}</td><td className="p-3">{boat.identifiers[0]?.value ?? "Por validar"}</td><td className="p-3">{boat.certificates[0]?.status ?? "MISSING"}</td><td className="p-3">{boat._count.stageBoats}</td></tr>)}</tbody>
        </table>
      </Card>
    </main>
  );
}
