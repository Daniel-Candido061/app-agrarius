import Link from "next/link";
import { AgrariusLogo } from "./components/app-shell";

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-[#f4f7f5] px-5 py-8 text-slate-800">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] sm:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#17352b] shadow-sm">
                  <AgrariusLogo className="h-14 w-14" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Agrarius
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold text-[#17352b] sm:text-4xl">
                    Agrarius Gestão
                  </h1>
                </div>
              </div>

              <p className="mt-8 text-lg leading-8 text-slate-600">
                Gestão integrada para acompanhar clientes, serviços, finanças e
                tarefas com uma visão clara da operação.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
            >
              Entrar
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
