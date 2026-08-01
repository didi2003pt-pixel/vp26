import Link from "next/link";
import { Card } from "@desafio/ui";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="w-full max-w-md">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-red">Acesso</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Entrar</h1>
        <p className="mt-2 mb-6 text-sm text-slate-600">Área técnica e administrativa da fundação.</p>
        <LoginForm />
        <p className="mt-6 text-sm text-slate-600">Ainda não tens conta? <Link className="font-bold text-brand-blue" href="/register">Registar</Link></p>
      </Card>
    </main>
  );
}
