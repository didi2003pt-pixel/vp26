import { Card } from "@desafio/ui";

export default function VerifyEmailPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="max-w-lg text-center">
        <h1 className="text-3xl font-black text-brand-navy">Confirma o teu email</h1>
        <p className="mt-4 text-slate-600">Enviámos uma ligação de confirmação. Em desenvolvimento, consulta o Mailpit em <code>localhost:8025</code>.</p>
      </Card>
    </main>
  );
}
