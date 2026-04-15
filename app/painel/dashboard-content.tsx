"use client";

import { useEffect, useRef, useState } from "react";
import { formatSimpleDate } from "../../lib/date-utils";
import {
  getClientName,
  getDaysUntilDeadline,
  type DashboardCommercialConversionMetric,
  type DashboardData,
  type DashboardServiceTypeMetric,
  type ServiceDashboardEntry,
} from "../../lib/dashboard-data";
import {
  getPeriodLabel,
  type PeriodValue,
  type QuickPeriodValue,
} from "../../lib/period-utils";
import { SummaryCard, SummaryCardsGrid } from "../components/summary-card";
import { DashboardTimeFilter } from "./dashboard-time-filter";

type TimeFilterMode = "rapido" | "personalizado";

type DashboardContentProps = {
  initialData: DashboardData;
  initialMode: TimeFilterMode;
  initialPeriod: QuickPeriodValue;
  initialSelectedPeriod: PeriodValue;
  initialStartDate: string;
  initialEndDate: string;
};

type DashboardApiResponse = {
  data: DashboardData;
  selectedQuickPeriod: QuickPeriodValue;
  selectedPeriod: PeriodValue;
  customStartDate: string;
  customEndDate: string;
  timeFilterMode: TimeFilterMode;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
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

  return `Faltam ${daysUntilDeadline} dias`;
}

function getOverdueLabel(value: string | null) {
  const daysUntilDeadline = getDaysUntilDeadline(value);

  if (daysUntilDeadline === null) {
    return "Prazo vencido";
  }

  const overdueDays = Math.abs(daysUntilDeadline);

  if (overdueDays === 0) {
    return "Vencido hoje";
  }

  if (overdueDays === 1) {
    return "1 dia de atraso";
  }

  return `${overdueDays} dias de atraso`;
}

async function loadDashboardData(
  mode: TimeFilterMode,
  quickPeriod: QuickPeriodValue,
  startDate: string,
  endDate: string
) {
  const searchParams = new URLSearchParams();

  searchParams.set("modoTempo", mode);

  if (mode === "rapido") {
    searchParams.set("periodo", quickPeriod);
  } else {
    if (startDate) {
      searchParams.set("dataInicial", startDate);
    }

    if (endDate) {
      searchParams.set("dataFinal", endDate);
    }
  }

  const response = await fetch(`/api/painel?${searchParams.toString()}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível atualizar os dados do painel.");
  }

  return (await response.json()) as DashboardApiResponse;
}

function DashboardSummary({
  dashboardData,
  selectedPeriodLabel,
}: {
  dashboardData: DashboardData;
  selectedPeriodLabel: string;
}) {
  const periodCards = [
    {
      title: "Entradas de serviço",
      value: String(dashboardData.servicosCriados),
      detail: `Serviços com data de entrada no período: ${selectedPeriodLabel.toLowerCase()}`,
      tone: "neutral" as const,
    },
    {
      title: "Clientes novos",
      value: String(dashboardData.clientesNovos),
      detail: `Clientes cadastrados dentro do período: ${selectedPeriodLabel.toLowerCase()}`,
      tone: "neutral" as const,
    },
    {
      title: "Total recebido",
      value: formatCurrency(dashboardData.totalRecebidoPeriodo),
      detail: "Receitas recebidas no período",
      tone: "success" as const,
    },
    {
      title: "Despesas pagas",
      value: formatCurrency(dashboardData.despesasPagasPeriodo),
      detail: "Despesas pagas no período",
      tone: "warning" as const,
    },
  ];

  return (
    <SummaryCardsGrid className="xl:grid-cols-4 2xl:grid-cols-4">
      {periodCards.map((card) => (
        <SummaryCard
          key={card.title}
          title={card.title}
          value={card.value}
          detail={card.detail}
          tone={card.tone}
          className="min-h-[188px] sm:min-h-[220px]"
        />
      ))}
    </SummaryCardsGrid>
  );
}

function SummaryCards({ dashboardData }: { dashboardData: DashboardData }) {
  const summaryCards = [
    {
      title: "Total a receber",
      value: formatCurrency(dashboardData.totalAReceber),
      detail: "Valor contratado menos receitas recebidas",
      tone: "info" as const,
    },
    {
      title: "Clientes com serviços em andamento",
      value: String(dashboardData.clientesComServicosEmAndamento),
      detail: "Situação atual, sem filtro de período",
      tone: "success" as const,
    },
    {
      title: "Serviços ativos",
      value: String(dashboardData.servicosAtivos ?? 0),
      detail: "Carteira operacional ainda aberta no momento",
      tone: "info" as const,
    },
    {
      title: "Tarefas atrasadas",
      value: String(dashboardData.tarefasAtrasadas),
      detail: 'Tarefas com prazo vencido e status diferente de "Concluído"',
      tone: "warning" as const,
    },
  ];

  return (
    <SummaryCardsGrid className="xl:grid-cols-4 2xl:grid-cols-4">
      {summaryCards.map((card) => (
        <SummaryCard
          key={card.title}
          title={card.title}
          value={card.value}
          detail={card.detail}
          tone={card.tone}
        />
      ))}
    </SummaryCardsGrid>
  );
}

function ImmediatePriorities({
  metrics,
}: {
  metrics: DashboardData["prioridadesImediatas"];
}) {
  const visibleMetrics = metrics.filter((metric) => metric.total > 0).slice(0, 4);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:rounded-2xl">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-lg font-semibold text-[#17352b]">
          Prioridades imediatas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          O que mais pede ação rápida na operação atual.
        </p>
      </div>

      {visibleMetrics.length === 0 ? (
        <div className="px-4 py-8 text-center sm:px-5 sm:py-10">
          <p className="text-sm font-medium text-slate-600">
            Nenhuma prioridade crítica aberta no momento.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Quando surgirem vencimentos, bloqueios ou itens prontos para virada, eles aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
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
                className={`rounded-2xl border px-4 py-4 ${toneClassName}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
                  Prioridade
                </p>
                <p className="mt-2 text-base font-semibold">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold">{metric.total}</p>
                <p className="mt-2 text-sm opacity-90">{metric.detalhe}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function UrgentServices({ services }: { services: ServiceDashboardEntry[] }) {
  return (
    <section className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,1))] shadow-[0_18px_40px_-24px_rgba(190,24,93,0.35)] sm:min-h-[420px] sm:rounded-2xl">
      <div className="border-b border-rose-100 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rose-900">
              Serviços urgentes
            </h2>
            <p className="text-sm text-rose-700/80">
              Serviços com prazo vencido que precisam de atenção imediata.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
            {services.length} em atraso
          </span>
        </div>
      </div>

        {services.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-5 sm:py-12">
            <div className="w-full max-w-sm rounded-2xl border border-dashed border-rose-200 bg-white/80 px-4 py-8 text-center shadow-sm sm:px-5 sm:py-10">
              <p className="text-sm font-medium text-rose-700">
                Nenhum serviço vencido no momento
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver serviços com prazo vencido, eles aparecerão aqui.
              </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:p-5">
          {services.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-rose-200 bg-white/90 p-4 shadow-[0_14px_28px_-18px_rgba(190,24,93,0.45)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  Urgente
                </span>
                <span className="text-xs font-medium text-rose-700">
                  {getOverdueLabel(service.prazo_final)}
                </span>
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                {service.nome_servico ?? "-"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {getClientName(service)}
              </p>

              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">
                  Prazo de entrega
                </p>
                <p className="mt-2 text-sm font-medium text-rose-700">
                  {formatSimpleDate(service.prazo_final)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingDeadlines({
  services,
}: {
  services: DashboardData["proximosPrazos"];
}) {
  return (
    <section className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:min-h-[420px] sm:rounded-2xl">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#17352b]">
            Próximos prazos de serviços
          </h2>
          <p className="text-sm text-slate-500">
            Serviços abertos com vencimento mais próximo.
          </p>
        </div>
      </div>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8 text-center sm:px-5 sm:py-12">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 sm:px-5 sm:py-10">
            <p className="text-sm font-medium text-slate-600">
              Nenhum prazo próximo cadastrado
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Quando houver serviços em aberto com prazo final, eles aparecerão aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:p-5">
          {services.map((service) => (
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

                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {getDeadlineLabel(service.prazo_final)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Prazo de entrega</span>
                  <span className="font-medium text-slate-700">
                    {formatSimpleDate(service.prazo_final)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Em aberto</span>
                  <span className="font-semibold text-[#17352b]">
                    {formatCurrency(service.valorEmAberto)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OpenServices({
  services,
  total,
}: {
  services: DashboardData["servicosNaoQuitadosLista"];
  total: number;
}) {
  return (
    <section className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:min-h-[420px] sm:rounded-2xl">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17352b]">
              Serviços não quitados
            </h2>
            <p className="text-sm text-slate-500">
              Serviços com total recebido menor que o valor contratado.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {total} em aberto
          </span>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-5 sm:py-12">
          <p className="text-sm font-medium text-emerald-700">
            Nenhum serviço em aberto no momento
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Todos os serviços cadastrados estão quitados.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:p-5">
          {services.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#17352b]">
                    {service.nome_servico ?? "-"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {getClientName(service)}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {service.status ?? "Sem status"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-sm">
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
      )}
    </section>
  );
}

function ResponsibleWorkload({
  metrics,
  highPriorityPendings,
}: {
  metrics: DashboardData["carteiraPorResponsavel"];
  highPriorityPendings: number;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:rounded-2xl">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17352b]">
              Carteira por responsavel
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Distribuicao da carga ativa com atrasos e pendencias
              bloqueadoras por pessoa.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            {highPriorityPendings} pendencias altas abertas
          </span>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="px-4 py-8 text-center sm:px-5 sm:py-10">
          <p className="text-sm font-medium text-slate-600">
            Ainda nao ha distribuicao suficiente para leitura por responsavel.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Quando houver atribuicoes nos registros ativos, a carteira aparecera
            consolidada aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:p-5">
          {metrics.map((metric) => (
            (() => {
              const pressureScore =
                metric.pendencias_altas * 4 +
                metric.servicos_atrasados * 3 +
                metric.tarefas_atrasadas * 2 +
                Math.max(metric.servicos_ativos - 3, 0);
              const pressureLabel =
                pressureScore >= 8
                  ? "Pressão alta"
                  : pressureScore >= 4
                    ? "Pressão moderada"
                    : "Pressão controlada";
              const pressureClassName =
                pressureScore >= 8
                  ? "bg-rose-50 text-rose-700"
                  : pressureScore >= 4
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700";

              return (
                <article
                  key={metric.responsavel_id ?? metric.responsavel_label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#17352b]">
                        {metric.responsavel_label}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Servicos abertos, atrasos e pontos de bloqueio da carteira
                        atual.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${pressureClassName}`}>
                        {pressureLabel}
                      </span>
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {metric.servicos_ativos} ativos
                      </span>
                      <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        {metric.servicos_atrasados} atrasados
                      </span>
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {metric.tarefas_atrasadas} tarefas vencidas
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Servicos ativos
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#17352b]">
                    {metric.servicos_ativos}
                  </p>
                </div>

                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Tarefas vencidas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-amber-700">
                    {metric.tarefas_atrasadas}
                  </p>
                </div>

                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Pendencias altas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-rose-700">
                    {metric.pendencias_altas}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Pressão
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#17352b]">
                    {pressureScore}
                  </p>
                </div>
                  </div>
                </article>
              );
            })()
          ))}
        </div>
      )}
    </section>
  );
}

function OperationalQueues({
  metrics,
}: {
  metrics: DashboardData["gargalosOperacionais"];
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:rounded-2xl">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-lg font-semibold text-[#17352b]">
          Gargalos operacionais
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Visao rapida da carteira parada, aguardando retorno ou pronta para a
          proxima virada.
        </p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {metrics.map((metric) => (
          <article
            key={metric.chave}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#17352b]">
                  {metric.label}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{metric.detalhe}</p>
              </div>

              <span className="shrink-0 rounded-full bg-[#17352b] px-3 py-1 text-xs font-semibold text-white">
                {metric.total}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ServiceTypeMetrics({
  metrics,
}: {
  metrics: DashboardServiceTypeMetric[];
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:rounded-2xl">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-lg font-semibold text-[#17352b]">
          Desempenho por tipo de serviço
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Base histórica de serviços concluídos, com tempo, ticket e margem calculados de forma conservadora.
        </p>
      </div>

      {metrics.length === 0 ? (
        <div className="px-4 py-8 text-center sm:px-5 sm:py-12">
          <p className="text-sm font-medium text-slate-600">
            Ainda não há base suficiente para as métricas por tipo.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            As médias aparecem quando houver serviços concluídos com dados consistentes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Tipo
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Tempo médio
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Ticket médio
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Margem média
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.slice(0, 6).map((metric) => (
                <tr key={metric.tipo_servico ?? "sem-tipo"} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#17352b]">
                      {metric.tipo_servico ?? "Sem tipo"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {metric.quantidade_servicos_concluidos ?? 0} serviços concluídos
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {metric.tempo_medio_dias === null ||
                    metric.tempo_medio_dias === undefined
                      ? "-"
                      : `${metric.tempo_medio_dias} dias`}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-700">
                    {metric.ticket_medio === null || metric.ticket_medio === undefined
                      ? "-"
                      : formatCurrency(metric.ticket_medio)}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-700">
                    {formatPercent(metric.margem_media)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CommercialConversionList({
  title,
  description,
  metrics,
}: {
  title: string;
  description: string;
  metrics: DashboardCommercialConversionMetric[];
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:rounded-2xl sm:p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#17352b]">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {metrics.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ainda não há propostas suficientes para calcular esta conversão.
        </p>
      ) : (
        <div className="space-y-3">
          {metrics.slice(0, 5).map((metric) => (
            <article
              key={`${metric.dimensao}-${metric.agrupador}`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#17352b]">
                    {metric.agrupador ?? "Não informado"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {metric.propostas_ganhas ?? 0} ganhas de{" "}
                    {metric.total_propostas ?? 0} propostas
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {formatPercent(metric.taxa_conversao)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ManagementIntelligence({
  dashboardData,
}: {
  dashboardData: DashboardData;
}) {
  return (
    <section className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#17352b]">
          Inteligência de gestão
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Leituras históricas para orientar precificação, foco comercial e tomada de decisão sem transformar o sistema em BI.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.35fr_1fr]">
        <ServiceTypeMetrics metrics={dashboardData.metricasServicosPorTipo} />

        <div className="space-y-5">
          <CommercialConversionList
            title="Conversão comercial por tipo"
            description="Taxa de propostas ganhas em relação ao total por tipo de serviço."
            metrics={dashboardData.conversaoComercialPorTipo}
          />
          <CommercialConversionList
            title="Conversão comercial por origem"
            description="Ajuda a entender quais canais trazem oportunidades mais qualificadas."
            metrics={dashboardData.conversaoComercialPorOrigem}
          />
        </div>
      </div>
    </section>
  );
}

export function DashboardContent({
  initialData,
  initialMode,
  initialPeriod,
  initialSelectedPeriod,
  initialStartDate,
  initialEndDate,
}: DashboardContentProps) {
  const [dashboardData, setDashboardData] = useState(initialData);
  const [mode, setMode] = useState<TimeFilterMode>(initialMode);
  const [quickPeriod, setQuickPeriod] =
    useState<QuickPeriodValue>(initialPeriod);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodValue>(initialSelectedPeriod);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hasInitializedAutoFilter = useRef(false);

  const selectedPeriodLabel =
    mode === "personalizado"
      ? "personalizado"
      : getPeriodLabel(selectedPeriod);

  useEffect(() => {
    if (!hasInitializedAutoFilter.current) {
      hasInitializedAutoFilter.current = true;
      return;
    }

    let isActive = true;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await loadDashboardData(
          mode,
          quickPeriod,
          startDate,
          endDate
        );

        if (!isActive) {
          return;
        }

        setDashboardData(response.data);
        setMode(response.timeFilterMode);
        setQuickPeriod(response.selectedQuickPeriod);
        setStartDate(response.customStartDate);
        setEndDate(response.customEndDate);
        setSelectedPeriod(response.selectedPeriod);
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error(error);
        setErrorMessage("Nao foi possivel atualizar os dados do painel.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }, 160);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [mode, quickPeriod, startDate, endDate]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <DashboardTimeFilter
        mode={mode}
        quickPeriod={quickPeriod}
        startDate={startDate}
        endDate={endDate}
        isPending={isLoading}
        errorMessage={errorMessage}
        onModeChange={setMode}
        onQuickPeriodChange={setQuickPeriod}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <section>
        <div className="mb-4 sm:mb-5">
          <h2 className="text-xl font-semibold text-[#17352b]">
            Indicadores do período
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores de entrada e financeiro para entender o desempenho do recorte selecionado.
          </p>
        </div>
        <DashboardSummary
          dashboardData={dashboardData}
          selectedPeriodLabel={selectedPeriodLabel}
        />
      </section>

      <section>
        <div className="mb-4 sm:mb-5">
          <h2 className="text-xl font-semibold text-[#17352b]">
            Operação atual
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Leitura executiva da carteira ativa antes das listas de atenção operacional.
          </p>
        </div>
        <SummaryCards dashboardData={dashboardData} />
      </section>

      <ImmediatePriorities metrics={dashboardData.prioridadesImediatas} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <ResponsibleWorkload
          metrics={dashboardData.carteiraPorResponsavel}
          highPriorityPendings={dashboardData.pendenciasAltasAbertas}
        />
        <OperationalQueues metrics={dashboardData.gargalosOperacionais} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <UrgentServices services={dashboardData.servicosUrgentes} />
        <UpcomingDeadlines services={dashboardData.proximosPrazos} />
        <OpenServices
          services={dashboardData.servicosNaoQuitadosLista}
          total={dashboardData.servicosNaoQuitados}
        />
      </section>

      <ManagementIntelligence dashboardData={dashboardData} />
    </div>
  );
}


