"use client";

import type { ReactNode } from "react";

import { formatSimpleDate } from "../../lib/date-utils";
import {
  getClientName,
  getDaysUntilDeadline,
  type DashboardData,
} from "../../lib/dashboard-data";
import { SummaryCard, SummaryCardsGrid } from "../components/summary-card";

type DashboardContentProps = {
  initialData: DashboardData;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getDeadlineLabel(value: string | null) {
  const daysUntilDeadline = getDaysUntilDeadline(value);

  if (daysUntilDeadline === null) {
    return "Sem prazo";
  }

  if (daysUntilDeadline === 0) {
    return "Vence hoje";
  }

  if (daysUntilDeadline === 1) {
    return "Vence amanhã";
  }

  if (daysUntilDeadline < 0) {
    const overdueDays = Math.abs(daysUntilDeadline);
    return overdueDays === 1 ? "1 dia de atraso" : `${overdueDays} dias de atraso`;
  }

  return `Faltam ${daysUntilDeadline} dias`;
}

function FocusedSummary({ dashboardData }: { dashboardData: DashboardData }) {
  const cards = [
    {
      title: "Serviços ativos",
      value: String(dashboardData.servicosAtivos ?? 0),
      detail: "Carteira operacional aberta neste momento.",
      tone: "info" as const,
    },
    {
      title: "Prazos vencidos",
      value: String(dashboardData.servicosAtrasados),
      detail: "Serviços abertos com prazo final já vencido.",
      tone: "danger" as const,
    },
    {
      title: "Tarefas atrasadas",
      value: String(dashboardData.tarefasAtrasadas),
      detail: "Atividades fora do prazo que ainda pedem ação.",
      tone: "warning" as const,
    },
    {
      title: "Serviços em aberto",
      value: String(dashboardData.servicosNaoQuitados),
      detail: "Serviços que ainda não foram totalmente quitados.",
      tone: "warning" as const,
    },
    {
      title: "Total a receber",
      value: formatCurrency(dashboardData.totalAReceber),
      detail: "Valor ainda em aberto na carteira atual.",
      tone: "neutral" as const,
    },
    {
      title: "Clientes em andamento",
      value: String(dashboardData.clientesComServicosEmAndamento),
      detail: "Clientes com serviços ativos na operação atual.",
      tone: "success" as const,
    },
  ];

  return (
    <SummaryCardsGrid className="xl:grid-cols-3 2xl:grid-cols-3">
      {cards.map((card) => (
        <SummaryCard
          key={card.title}
          title={card.title}
          value={card.value}
          detail={card.detail}
          tone={card.tone}
          compact
        />
      ))}
    </SummaryCardsGrid>
  );
}

function PriorityStrip({
  metrics,
}: {
  metrics: DashboardData["prioridadesImediatas"];
}) {
  const visibleMetrics = metrics
    .filter((metric) => metric.total > 0 && metric.chave !== "pendencias_altas")
    .slice(0, 4);

  if (visibleMetrics.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visibleMetrics.map((metric) => {
        const toneClassName =
          metric.tone === "danger"
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : metric.tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : metric.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : metric.tone === "info"
                  ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                  : "border-slate-200 bg-slate-50 text-slate-700";

        return (
          <article
            key={metric.chave}
            className={`rounded-2xl border px-4 py-4 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.45)] ${toneClassName}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
              Próxima ação
            </p>
            <p className="mt-2 text-base font-semibold">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold">{metric.total}</p>
            <p className="mt-2 text-sm opacity-90">{metric.detalhe}</p>
          </article>
        );
      })}
    </section>
  );
}

function ActionListCard({
  title,
  description,
  badge,
  emptyTitle,
  emptyDescription,
  children,
  tone = "neutral",
}: {
  title: string;
  description: string;
  badge?: string;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
  tone?: "neutral" | "danger" | "warning";
}) {
  const toneClassName =
    tone === "danger"
      ? "border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,1))]"
      : tone === "warning"
        ? "border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,255,255,1))]"
        : "border-slate-200 bg-white";

  const badgeClassName =
    tone === "danger"
      ? "bg-rose-100 text-rose-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <section
      className={`flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] border shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:rounded-2xl ${toneClassName}`}
    >
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17352b]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          {badge ? (
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}
            >
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {children ? (
          children
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5 sm:py-12">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 sm:px-5 sm:py-10">
              <p className="text-sm font-medium text-slate-600">{emptyTitle}</p>
              <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function UrgentServices({
  services,
}: {
  services: DashboardData["servicosUrgentes"];
}) {
  if (services.length === 0) {
    return (
      <ActionListCard
        title="Serviços urgentes"
        description="O que já está vencido e pede reação imediata."
        badge="Tudo sob controle"
        emptyTitle="Nenhum serviço vencido no momento"
        emptyDescription="Quando houver serviços em atraso, eles aparecem aqui."
        tone="danger"
      >
        {null}
      </ActionListCard>
    );
  }

  return (
    <ActionListCard
      title="Serviços urgentes"
      description="O que já está vencido e pede reação imediata."
      badge={`${services.length} em atraso`}
      emptyTitle=""
      emptyDescription=""
      tone="danger"
    >
      <div className="grid gap-3 p-4 sm:p-5">
        {services.slice(0, 4).map((service) => (
          <article
            key={service.id}
            className="rounded-2xl border border-rose-200 bg-white/90 p-4 shadow-[0_14px_28px_-18px_rgba(190,24,93,0.45)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-800">
                  {service.nome_servico ?? "-"}
                </h3>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {getClientName(service)}
                </p>
              </div>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                {getDeadlineLabel(service.prazo_final)}
              </span>
            </div>

            <p className="mt-4 text-sm font-medium text-rose-700">
              Prazo: {formatSimpleDate(service.prazo_final)}
            </p>
          </article>
        ))}
      </div>
    </ActionListCard>
  );
}

function UpcomingDeadlines({
  services,
}: {
  services: DashboardData["proximosPrazos"];
}) {
  if (services.length === 0) {
    return (
      <ActionListCard
        title="Próximos prazos"
        description="Os serviços abertos que vencem primeiro."
        badge="Sem pressão próxima"
        emptyTitle="Nenhum prazo próximo cadastrado"
        emptyDescription="Quando houver vencimentos em aberto, eles aparecem aqui."
        tone="warning"
      >
        {null}
      </ActionListCard>
    );
  }

  return (
    <ActionListCard
      title="Próximos prazos"
      description="Os serviços abertos que vencem primeiro."
      badge={`${services.length} próximos`}
      emptyTitle=""
      emptyDescription=""
      tone="warning"
    >
      <div className="grid gap-3 p-4 sm:p-5">
        {services.slice(0, 4).map((service) => (
          <article
            key={service.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-[#17352b]">
                  {service.nome_servico ?? "-"}
                </h3>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {getClientName(service)}
                </p>
              </div>

              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {getDeadlineLabel(service.prazo_final)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">
                Prazo {formatSimpleDate(service.prazo_final)}
              </span>
              <span className="font-semibold text-[#17352b]">
                {formatCurrency(service.valorEmAberto)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </ActionListCard>
  );
}

function OpenFinancialItems({
  services,
}: {
  services: DashboardData["servicosNaoQuitadosLista"];
}) {
  if (services.length === 0) {
    return (
      <ActionListCard
        title="Financeiro em aberto"
        description="Serviços ainda não quitados pela carteira atual."
        badge="Sem aberto"
        emptyTitle="Nenhum serviço em aberto no momento"
        emptyDescription="Todos os serviços cadastrados estão quitados."
      >
        {null}
      </ActionListCard>
    );
  }

  return (
    <ActionListCard
      title="Financeiro em aberto"
      description="Serviços ainda não quitados pela carteira atual."
      badge={`${services.length} pendentes`}
      emptyTitle=""
      emptyDescription=""
    >
      <div className="grid gap-3 p-4 sm:p-5">
        {services.slice(0, 4).map((service) => (
          <article
            key={service.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-[#17352b]">
                  {service.nome_servico ?? "-"}
                </h3>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {getClientName(service)}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {service.status ?? "Sem status"}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Recebido</span>
                <span className="font-medium text-emerald-700">
                  {formatCurrency(service.totalRecebido)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Em aberto</span>
                <span className="font-semibold text-amber-700">
                  {formatCurrency(service.valorEmAberto)}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </ActionListCard>
  );
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  return (
    <div className="space-y-6 sm:space-y-7">
      <section>
        <div className="mb-4 sm:mb-5">
          <h2 className="text-xl font-semibold text-[#17352b]">
            O que precisa de atenção
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Um resumo direto da operação, sem misturar rotina diária com análise histórica.
          </p>
        </div>
        <FocusedSummary dashboardData={initialData} />
      </section>

      <PriorityStrip metrics={initialData.prioridadesImediatas} />

      <section className="grid gap-4 xl:grid-cols-3">
        <UrgentServices services={initialData.servicosUrgentes} />
        <UpcomingDeadlines services={initialData.proximosPrazos} />
        <OpenFinancialItems services={initialData.servicosNaoQuitadosLista} />
      </section>
    </div>
  );
}
