import Link from "next/link";
import { Card } from "@desafio/ui";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="w-full max-w-lg">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-lime">Fundação</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Criar conta</h1>
        <p className="mt-2 mb-6 text-sm text-slate-600">O registo público permanece controlado por feature flag até à Fase 2.</p>
        <RegisterForm />
        <p className="mt-6 text-sm text-slate-600">Já tens conta? <Link className="font-bold text-brand-blue" href="/login">Entrar</Link></p>
      </Card>
    </main>
  );
}
