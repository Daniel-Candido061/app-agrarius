"use client";

import { useState } from "react";
import { formatSimpleDate } from "../../lib/date-utils";
import {
  getClientName,
  getDaysUntilDeadline,
  type DashboardData,
  type ServiceDashboardEntry,
} from "../../lib/dashboard-data";
import {
  getPeriodLabel,
  type PeriodValue,
  type QuickPeriodValue,
} from "../../lib/period-utils";
import { DashboardTimeFilter } from "./dashboard-time-filter";

type TimeFilterMode = "rapido" | "personalizado";

type DashboardContentProps = {
  initialData: DashboardData;
  initialMode: TimeFilterMode;
  initialPeriod: QuickPeriodValue;
  initialSelectedPeriod: PeriodValue;
  initialStartDate: string;
  initialEndDate: string;
  initialIsOpen: boolean;
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
      title: "Clientes novos no periodo",
      value: String(dashboardData.clientesNovos),
      detail: `Clientes cadastrados dentro do periodo: ${selectedPeriodLabel.toLowerCase()}`,
    },
    {
      title: "Servicos criados",
      value: String(dashboardData.servicosCriados),
      detail: `Servicos cadastrados no periodo: ${selectedPeriodLabel.toLowerCase()}`,
    },
    {
      title: "Total recebido",
      value: formatCurrency(dashboardData.totalRecebidoPeriodo),
      detail: "Receitas recebidas no periodo",
    },
    {
      title: "Despesas pagas",
      value: formatCurrency(dashboardData.despesasPagasPeriodo),
      detail: "Despesas pagas no periodo",
    },
    {
      title: "Lucro realizado",
      value: formatCurrency(dashboardData.lucroRealizadoPeriodo),
      detail: "Receitas recebidas menos despesas pagas no periodo",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
      {periodCards.map((card) => (
        <article
          key={card.title}
          className="flex min-h-[168px] flex-col justify-between rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-5 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.28)]"
        >
          <div className="pr-2">
            <p className="text-sm font-semibold leading-5 text-slate-600">
              {card.title}
            </p>
          </div>
          <strong className="mt-6 block text-3xl leading-none font-semibold tracking-[-0.03em] text-[#17352b] sm:text-[2rem]">
            {card.value}
          </strong>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            {card.detail}
          </p>
        </article>
      ))}
    </div>
  );
}

function SummaryCards({ dashboardData }: { dashboardData: DashboardData }) {
  const summaryCards = [
    {
      title: "Total a receber",
      value: formatCurrency(dashboardData.totalAReceber),
      detail: "Valor contratado menos receitas recebidas",
    },
    {
      title: "Clientes com servicos em andamento",
      value: String(dashboardData.clientesComServicosEmAndamento),
      detail: "Situacao atual, sem filtro de periodo",
    },
    {
      title: "Servicos atrasados",
      value: String(dashboardData.servicosAtrasados),
      detail: "Servicos com prazo final vencido e ainda abertos",
    },
    {
      title: "Tarefas atrasadas",
      value: String(dashboardData.tarefasAtrasadas),
      detail: 'Tarefas com prazo vencido e status diferente de "Concluido"',
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => (
        <article
          key={card.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]"
        >
          <p className="text-sm font-medium text-slate-500">{card.title}</p>
          <strong className="mt-4 block text-3xl font-semibold text-[#17352b]">
            {card.value}
          </strong>
          <p className="mt-3 text-sm text-slate-500">{card.detail}</p>
        </article>
      ))}
    </div>
  );
}

function UrgentServices({ services }: { services: ServiceDashboardEntry[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,1))] shadow-[0_18px_40px_-24px_rgba(190,24,93,0.35)]">
      <div className="border-b border-rose-100 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-rose-900">
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
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-emerald-700">
            Nenhum servico vencido no momento
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Quando houver servicos com prazo vencido, eles aparecerao aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-rose-200 bg-white/90 p-5 shadow-[0_14px_28px_-18px_rgba(190,24,93,0.45)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  Urgente
                </span>
                <span className="text-xs font-medium text-rose-700">
                  {getOverdueLabel(service.prazo_final)}
                </span>
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-800">
                {service.nome_servico ?? "-"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Cliente: {getClientName(service)}
              </p>

              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">
                  Prazo final
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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#17352b]">
            Proximos prazos de servicos
          </h2>
          <p className="text-sm text-slate-500">
            Servicos abertos com vencimento mais proximo.
          </p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">
            Nenhum prazo proximo cadastrado
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Quando houver servicos em aberto com prazo final, eles aparecerao aqui.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Servico
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Prazo final
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Em aberto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Situacao
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-4 text-sm font-medium text-slate-700">
                    {getClientName(service)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">
                    {service.nome_servico ?? "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">
                    {formatSimpleDate(service.prazo_final)}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-[#17352b]">
                    {formatCurrency(service.valorEmAberto)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {getDeadlineLabel(service.prazo_final)}
                    </span>
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

function OpenServices({
  services,
  total,
}: {
  services: DashboardData["servicosNaoQuitadosLista"];
  total: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#17352b]">
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
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-emerald-700">
            Nenhum servico em aberto no momento
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Todos os servicos cadastrados estao quitados.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
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

export function DashboardContent({
  initialData,
  initialMode,
  initialPeriod,
  initialSelectedPeriod,
  initialStartDate,
  initialEndDate,
  initialIsOpen,
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
    <div className="space-y-6">
      <DashboardTimeFilter
        mode={mode}
        quickPeriod={quickPeriod}
        startDate={startDate}
        endDate={endDate}
        initialIsOpen={initialIsOpen}
        isPending={isLoading}
        errorMessage={errorMessage}
        onModeChange={setMode}
        onQuickPeriodChange={setQuickPeriod}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApply}
      >
        <DashboardSummary
          dashboardData={dashboardData}
          selectedPeriodLabel={selectedPeriodLabel}
        />
      </DashboardTimeFilter>

      <SummaryCards dashboardData={dashboardData} />
      <UrgentServices services={dashboardData.servicosUrgentes} />
      <UpcomingDeadlines services={dashboardData.proximosPrazos} />
      <OpenServices
        services={dashboardData.servicosNaoQuitadosLista}
        total={dashboardData.servicosNaoQuitados}
      />
    </div>
  );
}
