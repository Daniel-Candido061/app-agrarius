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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
              <AgrariusLogo className="h-10 w-10" />
            </span>
            <span className="text-lg font-semibold text-[#17352b]">
              Agrarius Gestão
            </span>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-[#17352b] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="px-5 py-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="relative isolate overflow-hidden rounded-lg bg-[#17352b] px-6 py-10 text-white shadow-[0_20px_45px_-28px_rgba(15,23,42,0.55)] sm:px-10 sm:py-14 lg:grid lg:min-h-[520px] lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-10 lg:px-14">
            <div className="absolute inset-0 opacity-20">
              <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:48px_48px]" />
            </div>

            <div className="relative z-10 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d8f3d2]">
                Sistema interno de gestão
              </p>
              <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Gestão operacional e financeira em um ambiente centralizado.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100 sm:text-lg">
                O Agrarius Gestão reúne clientes, serviços, tarefas, financeiro
                e prazos em uma experiência simples para acompanhar a operação
                com mais organização.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#17352b] shadow-sm transition hover:bg-[#f4f7f5]"
                >
                  Entrar no sistema
                </Link>
                <Link
                  href="#apresentacao"
                  className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Conhecer o sistema
                </Link>
              </div>
            </div>

            <div className="relative z-10 mt-10 lg:mt-0">
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
                <div className="rounded-lg bg-white p-4 text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
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
                        className="rounded-lg border border-slate-100 bg-[#f4f7f5] p-4"
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

                  <div className="mt-5 rounded-lg border border-slate-100 p-4">
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

      <section id="apresentacao" className="px-5 pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4f8f52]">
              Portal de acesso
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#17352b] sm:text-3xl">
              Uma base única para a rotina administrativa.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {presentationItems.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.45)]"
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

      <footer className="border-t border-slate-200 bg-white px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Agrarius Gestão</p>
          <p>Portal interno para operações, serviços, tarefas e finanças.</p>
        </div>
      </footer>
    </main>
  );
}
