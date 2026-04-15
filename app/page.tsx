import Link from "next/link";

import { AgrariusLogo } from "./components/app-shell";

const presentationItems = [
  {
    title: "Gestão de clientes",
    description: "Organize informações comerciais e acompanhe cada carteira.",
  },
  {
    title: "Organização de serviços",
    description: "Centralize contratos, etapas, prazos e responsáveis.",
  },
  {
    title: "Controle financeiro",
    description: "Acompanhe receitas, despesas e saldos com mais clareza.",
  },
  {
    title: "Acompanhamento de tarefas",
    description: "Mantenha a rotina operacional visível e bem distribuída.",
  },
];

const workflowItems = ["Clientes", "Serviços", "Financeiro", "Tarefas"];

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-[#f4f7f5] text-slate-800">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
              <AgrariusLogo className="h-10 w-10" />
            </span>
            <span className="text-base font-semibold text-[#17352b] sm:text-lg">
              Agrarius Gestão
            </span>
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#17352b] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638] sm:px-5"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="px-4 py-5 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="relative isolate overflow-hidden rounded-[24px] bg-[#17352b] px-4 py-6 text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.55)] sm:rounded-[28px] sm:px-10 sm:py-14 lg:grid lg:min-h-[520px] lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-10 lg:px-14">
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:48px_48px]" />
            </div>

            <div className="relative z-10 max-w-3xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#d8f3d2] sm:text-sm sm:tracking-[0.2em]">
                Sistema interno de gestão
              </p>
              <h1 className="mt-3 max-w-2xl text-[1.95rem] font-semibold leading-tight text-white sm:mt-5 sm:text-5xl">
                Gestão operacional e financeira em um ambiente centralizado.
              </h1>
              <p className="mt-4 max-w-2xl text-[0.96rem] leading-6 text-slate-100 sm:mt-5 sm:text-lg sm:leading-7">
                O Agrarius Gestão reúne clientes, serviços, tarefas, financeiro
                e prazos em uma experiência simples para acompanhar a operação
                com mais organização.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#17352b] shadow-sm transition hover:bg-[#f4f7f5] sm:px-6"
                >
                  Entrar no sistema
                </Link>
                <Link
                  href="/conhecer-o-sistema"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-6"
                >
                  Conhecer o sistema
                </Link>
              </div>
            </div>

            <div className="relative z-10 mt-7 lg:mt-0">
              <div className="rounded-[22px] border border-white/15 bg-white/10 p-2.5 shadow-2xl backdrop-blur-sm sm:rounded-[24px] sm:p-4">
                <div className="rounded-[20px] bg-white p-3.5 text-slate-800 sm:rounded-[22px] sm:p-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Interface integrada
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[#17352b]">
                        Fluxo de gestão
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f7f5]">
                      <AgrariusLogo className="h-8 w-8" />
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {workflowItems.map((item) => (
                      <div
                        key={item}
                        className="rounded-[18px] border border-slate-100 bg-[#f4f7f5] p-3.5 sm:rounded-[20px] sm:p-4"
                      >
                        <div className="mb-4 h-1.5 w-12 rounded-lg bg-[#8fcf8f]" />
                        <p className="text-sm font-semibold text-[#17352b]">
                          {item}
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="h-2 rounded-lg bg-slate-200" />
                          <div className="h-2 w-2/3 rounded-lg bg-slate-200" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[18px] border border-slate-100 p-3.5 sm:rounded-[20px] sm:p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-[#8fcf8f]" />
                      <div className="h-2 flex-1 rounded-lg bg-slate-200" />
                      <span className="h-3 w-3 rounded-full bg-[#8fcf8f]" />
                      <div className="h-2 flex-1 rounded-lg bg-slate-200" />
                      <span className="h-3 w-3 rounded-full bg-[#8fcf8f]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="apresentacao" className="px-4 pb-9 sm:px-5 sm:pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 max-w-2xl sm:mb-6">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#4f8f52] sm:text-sm">
              Portal de acesso
            </p>
            <h2 className="mt-2 text-[1.65rem] font-semibold text-[#17352b] sm:text-3xl">
              Uma base única para a rotina administrativa.
            </h2>
          </div>

          <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            {presentationItems.map((item) => (
              <article
                key={item.title}
                className="rounded-[22px] border border-slate-200 bg-white p-4 sm:rounded-[24px] sm:p-5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.45)]"
              >
                <div className="mb-4 h-1.5 w-12 rounded-lg bg-[#8fcf8f]" />
                <h3 className="text-lg font-semibold text-[#17352b]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-6 sm:px-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Agrarius Gestão</p>
          <p>Portal interno para operações, serviços, tarefas e finanças.</p>
        </div>
      </footer>
    </main>
  );
}
