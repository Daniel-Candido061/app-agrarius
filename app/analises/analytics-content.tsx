"use client";

import { useEffect, useRef, useState } from "react";

import type {
  DashboardCommercialConversionMetric,
  DashboardData,
  DashboardServiceTypeMetric,
} from "../../lib/dashboard-data";
import {
  getPeriodLabel,
  type PeriodValue,
  type QuickPeriodValue,
} from "../../lib/period-utils";
import { SummaryCard, SummaryCardsGrid } from "../components/summary-card";
import { DashboardTimeFilter } from "../painel/dashboard-time-filter";

type TimeFilterMode = "rapido" | "personalizado";

type AnalyticsContentProps = {
  initialData: DashboardData;
  initialMode: TimeFilterMode;
  initialPeriod: QuickPeriodValue;
  initialSelectedPeriod: PeriodValue;
  initialStartDate: string;
  initialEndDate: string;
};

type AnalyticsApiResponse = {
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

async function loadAnalyticsData(
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

  const response = await fetch(`/api/analises?${searchParams.toString()}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível atualizar as análises.");
  }

  return (await response.json()) as AnalyticsApiResponse;
}

function PeriodSummary({
  dashboardData,
  selectedPeriodLabel,
}: {
  dashboardData: DashboardData;
  selectedPeriodLabel: string;
}) {
  const cards = [
    {
      title: "Entradas de serviço",
      value: String(dashboardData.servicosCriados),
      detail: `Serviços que entraram em ${selectedPeriodLabel.toLowerCase()}.`,
      tone: "neutral" as const,
    },
    {
      title: "Clientes novos",
      value: String(dashboardData.clientesNovos),
      detail: "Clientes cadastrados no recorte selecionado.",
      tone: "neutral" as const,
    },
    {
      title: "Recebido no período",
      value: formatCurrency(dashboardData.totalRecebidoPeriodo),
      detail: "Receitas efetivamente recebidas.",
      tone: "success" as const,
    },
    {
      title: "Despesas pagas",
      value: formatCurrency(dashboardData.despesasPagasPeriodo),
      detail: "Despesas pagas dentro do recorte.",
      tone: "warning" as const,
    },
    {
      title: "Lucro realizado",
      value: formatCurrency(dashboardData.lucroRealizadoPeriodo),
      detail: "Recebido menos despesas pagas no período.",
      tone: "info" as const,
    },
  ];

  return (
    <SummaryCardsGrid className="xl:grid-cols-5 2xl:grid-cols-5">
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

function OperationalQueues({
  metrics,
}: {
  metrics: DashboardData["gargalosOperacionais"];
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:rounded-2xl">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-lg font-semibold text-[#17352b]">
          Gargalos da operação
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Visão consolidada das filas paradas, aguardando retorno ou prontas para avanço.
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
          Base histórica de tempo, ticket e margem por tipo de entrega concluída.
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
              {metrics.slice(0, 8).map((metric) => (
                <tr key={metric.tipo_servico ?? "sem-tipo"} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#17352b]">
                      {metric.tipo_servico ?? "Sem tipo"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {metric.quantidade_servicos_concluidos ?? 0} concluídos
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

export function AnalyticsContent({
  initialData,
  initialMode,
  initialPeriod,
  initialSelectedPeriod,
  initialStartDate,
  initialEndDate,
}: AnalyticsContentProps) {
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
      ? "período personalizado"
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
        const response = await loadAnalyticsData(
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
        setErrorMessage("Nao foi possivel atualizar as análises.");
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
            Leitura rápida do período
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Entradas, caixa e resultado do recorte selecionado.
          </p>
        </div>
        <PeriodSummary
          dashboardData={dashboardData}
          selectedPeriodLabel={selectedPeriodLabel}
        />
      </section>

      <OperationalQueues metrics={dashboardData.gargalosOperacionais} />

      <section className="space-y-4 sm:space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-[#17352b]">
            Inteligência comercial e de entrega
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Leituras históricas para entender tipos de serviço, conversão e qualidade da carteira.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.35fr_1fr]">
          <ServiceTypeMetrics metrics={dashboardData.metricasServicosPorTipo} />

          <div className="space-y-5">
            <CommercialConversionList
              title="Conversão por tipo"
              description="Taxa de propostas ganhas em relação ao total por tipo de serviço."
              metrics={dashboardData.conversaoComercialPorTipo}
            />
            <CommercialConversionList
              title="Conversão por origem"
              description="Ajuda a entender quais canais trazem oportunidades mais qualificadas."
              metrics={dashboardData.conversaoComercialPorOrigem}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
