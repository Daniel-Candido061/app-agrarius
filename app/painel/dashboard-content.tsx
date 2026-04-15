"use client";

import { useState } from "react";
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
    return "Vence amanha";
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
    throw new Error("Nao foi possivel atualizar os dados do painel.");
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
      title: "Entradas de servico",
      value: String(dashboardData.servicosCriados),
      detail: `Servicos com data de entrada no periodo: ${selectedPeriodLabel.toLowerCase()}`,
      tone: "neutral" as const,
    },
    {
      title: "Clientes novos",
      value: String(dashboardData.clientesNovos),
      detail: `Clientes cadastrados dentro do periodo: ${selectedPeriodLabel.toLowerCase()}`,
      tone: "neutral" as const,
    },
    {
      title: "Total recebido",
      value: formatCurrency(dashboardData.totalRecebidoPeriodo),
      detail: "Receitas recebidas no periodo",
      tone: "success" as const,
    },
    {
      title: "Despesas pagas",
      value: formatCurrency(dashboardData.despesasPagasPeriodo),
      detail: "Despesas pagas no periodo",
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
          className="min-h-[220px]"
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
      title: "Clientes com servicos em andamento",
      value: String(dashboardData.clientesComServicosEmAndamento),
      detail: "Situacao atual, sem filtro de periodo",
      tone: "success" as const,
    },
    {
      title: "Lucro realizado",
      value: formatCurrency(dashboardData.lucroRealizadoPeriodo),
      detail: "Resultado do periodo ja descontando as despesas pagas",
      tone: "success" as const,
    },
    {
      title: "Tarefas atrasadas",
      value: String(dashboardData.tarefasAtrasadas),
      detail: 'Tarefas com prazo vencido e status diferente de "Concluido"',
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

function UrgentServices({ services }: { services: ServiceDashboardEntry[] }) {
  return (
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,1))] shadow-[0_18px_40px_-24px_rgba(190,24,93,0.35)]">
      <div className="border-b border-rose-100 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rose-900">
              Servicos urgentes
            </h2>
            <p className="text-sm text-rose-700/80">
              Servicos com prazo vencido que precisam de atencao imediata.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
            {services.length} em atraso
          </span>
        </div>
      </div>

        {services.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-5 py-12">
            <div className="w-full max-w-sm rounded-2xl border border-dashed border-rose-200 bg-white/80 px-5 py-10 text-center shadow-sm">
              <p className="text-sm font-medium text-rose-700">
                Nenhum servico vencido no momento
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver servicos com prazo vencido, eles aparecerao aqui.
              </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-5">
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
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#17352b]">
            Proximos prazos de servicos
          </h2>
          <p className="text-sm text-slate-500">
            Servicos abertos com vencimento mais proximo.
          </p>
        </div>
      </div>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-12 text-center">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10">
            <p className="text-sm font-medium text-slate-600">
              Nenhum prazo proximo cadastrado
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Quando houver servicos em aberto com prazo final, eles aparecerao aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-5">
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
    <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#17352b]">
              Servicos nao quitados
            </h2>
            <p className="text-sm text-slate-500">
              Servicos com total recebido menor que o valor contratado.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {total} em aberto
          </span>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-12 text-center">
          <p className="text-sm font-medium text-emerald-700">
            Nenhum servico em aberto no momento
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Todos os servicos cadastrados estao quitados.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 p-5">
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

function ServiceTypeMetrics({
  metrics,
}: {
  metrics: DashboardServiceTypeMetric[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-lg font-semibold text-[#17352b]">
          Desempenho por tipo de servico
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Base historica de servicos concluidos, com tempo, ticket e margem calculados de forma conservadora.
        </p>
      </div>

      {metrics.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            Ainda nao ha base suficiente para as metricas por tipo.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            As medias aparecem quando houver servicos concluidos com dados consistentes.
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
                  Tempo medio
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Ticket medio
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Margem media
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
                      {metric.quantidade_servicos_concluidos ?? 0} servicos concluidos
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
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#17352b]">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {metrics.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ainda nao ha propostas suficientes para calcular esta conversao.
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
                    {metric.agrupador ?? "Nao informado"}
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
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[#17352b]">
          Inteligencia de gestao
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Leituras historicas para orientar precificacao, foco comercial e tomada de decisao sem transformar o sistema em BI.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <ServiceTypeMetrics metrics={dashboardData.metricasServicosPorTipo} />

        <div className="space-y-5">
          <CommercialConversionList
            title="Conversao comercial por tipo"
            description="Taxa de propostas ganhas em relacao ao total por tipo de servico."
            metrics={dashboardData.conversaoComercialPorTipo}
          />
          <CommercialConversionList
            title="Conversao comercial por origem"
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

  const selectedPeriodLabel =
    mode === "personalizado"
      ? "personalizado"
      : getPeriodLabel(selectedPeriod);

  async function handleApply() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await loadDashboardData(
        mode,
        quickPeriod,
        startDate,
        endDate
      );

      setDashboardData(response.data);
      setMode(response.timeFilterMode);
      setQuickPeriod(response.selectedQuickPeriod);
      setStartDate(response.customStartDate);
      setEndDate(response.customEndDate);
      setSelectedPeriod(response.selectedPeriod);
    } catch (error) {
      console.error(error);
      setErrorMessage("Nao foi possivel atualizar os dados do painel.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-7">
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
        onApply={handleApply}
      />

      <section>
        <div className="mb-4 sm:mb-5">
          <h2 className="text-xl font-semibold text-[#17352b]">
            Indicadores do periodo
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
            Operacao atual
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores complementares da carteira ativa, sem repetir os blocos operacionais logo abaixo.
          </p>
        </div>
        <SummaryCards dashboardData={dashboardData} />
      </section>

      <ManagementIntelligence dashboardData={dashboardData} />

      <section className="grid gap-5 xl:grid-cols-3">
        <UrgentServices services={dashboardData.servicosUrgentes} />
        <UpcomingDeadlines services={dashboardData.proximosPrazos} />
        <OpenServices
          services={dashboardData.servicosNaoQuitadosLista}
          total={dashboardData.servicosNaoQuitados}
        />
      </section>
    </div>
  );
}
