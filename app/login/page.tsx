import Link from "next/link";
import { redirect } from "next/navigation";
import { AgrariusLogo } from "../components/app-shell";
import { getAuthenticatedUser } from "../../lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "missing") {
    return "Informe email e senha para entrar.";
  }

  if (error === "invalid") {
    return "Email ou senha inválidos.";
  }

  return "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/painel");
  }

  const { error } = await searchParams;
  const errorMessage = getErrorMessage(error);

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-5 py-8 text-slate-800">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]">
          <div className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#17352b] shadow-sm">
              <AgrariusLogo className="h-14 w-14" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-[#17352b]">
              Entrar no Agrarius Gestão
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Acesse sua área de gestão com email e senha.
            </p>
          </div>

          <form action="/auth/login" method="post" className="mt-8 space-y-5">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Senha
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Digite sua senha"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
            >
              Entrar
            </button>
          </form>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center text-sm font-medium text-slate-500 transition hover:text-[#17352b]"
          >
            Voltar para a página inicial
          </Link>
        </div>
      </section>
    </main>
  );
}
