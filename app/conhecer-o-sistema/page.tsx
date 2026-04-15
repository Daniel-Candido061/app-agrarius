import Link from "next/link";

import { AgrariusLogo } from "../components/app-shell";

const features = [
  {
    title: "Gestão de clientes",
    description:
      "Organização das informações de clientes e histórico de serviços.",
  },
  {
    title: "Controle de serviços",
    description: "Acompanhamento de serviços em andamento e prazos.",
  },
  {
    title: "Gestão financeira",
    description:
      "Registro de receitas e despesas e acompanhamento de valores em aberto.",
  },
  {
    title: "Organização de tarefas",
    description: "Controle de atividades importantes e prazos operacionais.",
  },
];

const benefits = [
  "Melhor organização da rotina",
  "Visão clara da operação",
  "Controle financeiro centralizado",
  "Informações reunidas em um único ambiente",
];

export default function ConhecerOSistemaPage() {
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

      <section className="px-5 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] sm:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4f8f52]">
                Sistema interno da Agrarius
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#17352b] sm:text-5xl">
                Plataforma de gestão operacional e financeira.
              </h1>
              <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
                Sistema desenvolvido para organizar clientes, serviços,
                atividades e informações financeiras em um único ambiente
                integrado.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-lg border border-slate-200 bg-[#f4f7f5] p-5"
                >
                  <div className="mb-4 h-1.5 w-12 rounded-lg bg-[#8fcf8f]" />
                  <h2 className="text-lg font-semibold text-[#17352b]">
                    {feature.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>

            <section className="mt-10 rounded-lg bg-[#17352b] p-6 text-white sm:p-8">
              <h2 className="text-2xl font-semibold">
                Mais organização para a operação.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-100">
                O Agrarius Gestão apoia a centralização das informações, melhora
                a leitura da rotina e facilita o acompanhamento de serviços,
                tarefas e finanças em um fluxo mais claro.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white"
                  >
                    {benefit}
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500">
                Sistema interno da Agrarius.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Voltar
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-[#17352b] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
                >
                  Entrar no sistema
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Agrarius Gestão</p>
          <p>Portal institucional do sistema interno.</p>
        </div>
      </footer>
    </main>
  );
}
