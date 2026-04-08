import { connection } from "next/server";
import { AppShell } from "../components/app-shell";
import {
  formatSimpleDate,
  getDaysUntilSimpleDate,
  getSimpleDateTime,
  isBeforeTodayDateOnly,
  isTodayOrFutureDateOnly,
} from "../../lib/date-utils";
import { requireAuth } from "../../lib/auth";
import {
  getPeriodLabel,
  getPeriodValue,
  isDateInPeriod,
  periodOptions,
  type PeriodValue,
} from "../../lib/period-utils";
import { supabase } from "../../lib/supabase";

type FinancialEntry = {
  tipo: string | null;
  valor: number | string | null;
  status: string | null;
  data: string | null;
  servico_id: number | string | null;
};

type TaskDashboardEntry = {
  id: number;
  data_limite: string | null;
  status: string | null;
};

type ClientDashboardEntry = {
  id: number;
  created_at: string | null;
};

type ServiceDashboardEntry = {
  id: number;
  nome_servico: string | null;
  valor: number | string | null;
  created_at: string | null;
  prazo_final: string | null;
  status: string | null;
  cliente:
    | {
        nome: string | null;
      }
    | {
        nome: string | null;
      }[]
    | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function normalizeText(value: string | null) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function getNumericValue(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function getClientName(entry: ServiceDashboardEntry) {
  if (Array.isArray(entry.cliente)) {
    return entry.cliente[0]?.nome ?? "Cliente não encontrado";
  }

  return entry.cliente?.nome ?? "Cliente não encontrado";
}

function isClosedServiceStatus(status: string | null) {
  const normalizedStatus = normalizeText(status);

  return (
    normalizedStatus === "entregue" ||
    normalizedStatus === "concluido" ||
    normalizedStatus === "cancelado"
  );
}

function isPastDueService(entry: ServiceDashboardEntry) {
  if (!entry.prazo_final || isClosedServiceStatus(entry.status)) {
    return false;
  }

  return isBeforeTodayDateOnly(entry.prazo_final);
}

function isUpcomingService(entry: ServiceDashboardEntry) {
  if (!entry.prazo_final || isClosedServiceStatus(entry.status)) {
    return false;
  }

  return isTodayOrFutureDateOnly(entry.prazo_final);
}

function isPastDueTask(entry: TaskDashboardEntry) {
  if (!entry.data_limite) {
    return false;
  }

  const normalizedStatus = normalizeText(entry.status);

  if (normalizedStatus === "concluida" || normalizedStatus === "concluido") {
    return false;
  }

  return isBeforeTodayDateOnly(entry.data_limite);
}

function isRevenue(entry: FinancialEntry) {
  return normalizeText(entry.tipo) === "receita";
}

function isReceived(entry: FinancialEntry) {
  return normalizeText(entry.status) === "recebido";
}

function isExpense(entry: FinancialEntry) {
  return normalizeText(entry.tipo) === "despesa";
}

function isPaid(entry: FinancialEntry) {
  return normalizeText(entry.status) === "pago";
}

function getDaysUntilDeadline(value: string | null) {
  if (!value) {
    return null;
  }

  return getDaysUntilSimpleDate(value);
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

async function getDashboardData(
  selectedPeriod: PeriodValue,
  customStartDate: string,
  customEndDate: string
) {
  const [
    clientsResult,
    servicesResult,
    financeiroResult,
    tasksResult,
  ] = await Promise.all([
    supabase.from("clientes").select("id, created_at"),
    supabase
      .from("servicos")
      .select("id, nome_servico, valor, created_at, prazo_final, status, cliente:clientes(nome)"),
    supabase.from("financeiro").select("tipo, valor, status, data, servico_id"),
    supabase.from("tarefas").select("id, data_limite, status"),
  ]);

  if (clientsResult.error) {
    console.error("Erro ao buscar clientes do painel:", clientsResult.error.message);
  }

  if (servicesResult.error) {
    console.error("Erro ao buscar serviços do painel:", servicesResult.error.message);
  }

  if (financeiroResult.error) {
    console.error(
      "Erro ao buscar dados financeiros do painel:",
      financeiroResult.error.message
    );
  }

  if (tasksResult.error) {
    console.error("Erro ao buscar tarefas do painel:", tasksResult.error.message);
  }

  const clients = (clientsResult.data ?? []) as ClientDashboardEntry[];
  const services = (servicesResult.data ?? []) as ServiceDashboardEntry[];
  const financialEntries = (financeiroResult.data ?? []) as FinancialEntry[];
  const tasks = (tasksResult.data ?? []) as TaskDashboardEntry[];
  const periodFinancialEntries = financialEntries.filter((entry) =>
    isDateInPeriod(entry.data, selectedPeriod, customStartDate, customEndDate)
  );

  const servicosAtrasados = services.filter(isPastDueService).length;
  const tarefasAtrasadas = tasks.filter(isPastDueTask).length;

  const valorContratadoTotal = services.reduce(
    (total, service) => total + getNumericValue(service.valor),
    0
  );

  const totalRecebido = financialEntries
    .filter((entry) => isRevenue(entry) && isReceived(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const totalAReceber = valorContratadoTotal - totalRecebido;

  const clientesNovos = clients.filter((client) =>
    isDateInPeriod(
      client.created_at,
      selectedPeriod,
      customStartDate,
      customEndDate
    )
  ).length;

  const servicosCriados = services.filter((service) =>
    isDateInPeriod(
      service.created_at,
      selectedPeriod,
      customStartDate,
      customEndDate
    )
  ).length;

  const totalRecebidoPeriodo = periodFinancialEntries
    .filter((entry) => isRevenue(entry) && isReceived(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const despesasPagasPeriodo = periodFinancialEntries
    .filter((entry) => isExpense(entry) && isPaid(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const lucroRealizadoPeriodo = totalRecebidoPeriodo - despesasPagasPeriodo;

  const receivedByServiceId = new Map<string, number>();

  financialEntries
    .filter((entry) => isRevenue(entry) && isReceived(entry))
    .forEach((entry) => {
      if (entry.servico_id === null || entry.servico_id === undefined) {
        return;
      }

      const serviceId = String(entry.servico_id);
      const currentTotal = receivedByServiceId.get(serviceId) ?? 0;

      receivedByServiceId.set(
        serviceId,
        currentTotal + getNumericValue(entry.valor)
      );
    });

  const servicosNaoQuitados = services.filter((service) => {
    const valorContratado = getNumericValue(service.valor);
    const recebido = receivedByServiceId.get(String(service.id)) ?? 0;

    return recebido < valorContratado;
  });

  const proximosPrazos = services
    .filter(isUpcomingService)
    .sort((firstService, secondService) => {
      return (
        getSimpleDateTime(firstService.prazo_final) -
        getSimpleDateTime(secondService.prazo_final)
      );
    })
    .slice(0, 5);

  const servicosUrgentes = services
    .filter(isPastDueService)
    .sort((firstService, secondService) => {
      return (
        getSimpleDateTime(firstService.prazo_final) -
        getSimpleDateTime(secondService.prazo_final)
      );
    })
    .slice(0, 4);

  return {
    clientesNovos,
    servicosCriados,
    totalRecebidoPeriodo,
    despesasPagasPeriodo,
    lucroRealizadoPeriodo,
    servicosAtrasados,
    tarefasAtrasadas,
    totalAReceber,
    servicosNaoQuitados: servicosNaoQuitados.length,
    servicosNaoQuitadosLista: servicosNaoQuitados
      .map((service) => {
        const valorContratado = getNumericValue(service.valor);
        const recebido = receivedByServiceId.get(String(service.id)) ?? 0;

        return {
          ...service,
          valorContratado,
          totalRecebido: recebido,
          valorEmAberto: valorContratado - recebido,
        };
      })
      .sort(
        (firstService, secondService) =>
          secondService.valorEmAberto - firstService.valorEmAberto
      )
      .slice(0, 5),
    servicosUrgentes,
    proximosPrazos,
  };
}

type DashboardPageProps = {
  searchParams: Promise<{
    periodo?: string | string[];
    dataInicial?: string | string[];
    dataFinal?: string | string[];
  }>;
};

export default async function Home({ searchParams }: DashboardPageProps) {
  await connection();
  await requireAuth();

  const { periodo, dataInicial, dataFinal } = await searchParams;
  const selectedPeriod = getPeriodValue(periodo);
  const selectedPeriodLabel = getPeriodLabel(selectedPeriod);
  const customStartDate = Array.isArray(dataInicial)
    ? dataInicial[0] ?? ""
    : dataInicial ?? "";
  const customEndDate = Array.isArray(dataFinal)
    ? dataFinal[0] ?? ""
    : dataFinal ?? "";
  const dashboardData = await getDashboardData(
    selectedPeriod,
    customStartDate,
    customEndDate
  );

  const periodCards = [
    {
      title: "Clientes novos",
      value: String(dashboardData.clientesNovos),
      detail: `Clientes cadastrados no período: ${selectedPeriodLabel.toLowerCase()}`,
    },
    {
      title: "Serviços criados",
      value: String(dashboardData.servicosCriados),
      detail: `Serviços cadastrados no período: ${selectedPeriodLabel.toLowerCase()}`,
    },
    {
      title: "Total recebido",
      value: formatCurrency(dashboardData.totalRecebidoPeriodo),
      detail: "Receitas recebidas no período",
    },
    {
      title: "Despesas pagas",
      value: formatCurrency(dashboardData.despesasPagasPeriodo),
      detail: "Despesas pagas no período",
    },
    {
      title: "Lucro realizado",
      value: formatCurrency(dashboardData.lucroRealizadoPeriodo),
      detail: "Receitas recebidas menos despesas pagas no período",
    },
  ];

  const summaryCards = [
    {
      title: "Total a receber",
      value: formatCurrency(dashboardData.totalAReceber),
      detail: "Valor contratado menos receitas recebidas",
    },
    {
      title: "Serviços não quitados",
      value: String(dashboardData.servicosNaoQuitados),
      detail: "Serviços com recebido menor que o contratado",
    },
    {
      title: "Serviços atrasados",
      value: String(dashboardData.servicosAtrasados),
      detail: "Serviços com prazo final vencido e ainda abertos",
    },
    {
      title: "Tarefas atrasadas",
      value: String(dashboardData.tarefasAtrasadas),
      detail: 'Tarefas com prazo vencido e status diferente de "Concluído"',
    },
  ];

  return (
    <AppShell
      title="Painel de Gestão"
      description="Visão geral com dados reais sincronizados com o Supabase."
      currentPath="/painel"
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Recorte de tempo
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#17352b]">
                Resumo do período
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Indicadores calculados para o período selecionado.
              </p>
            </div>

            <form className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
              <label
                htmlFor="dashboard-period"
                className="text-sm font-medium text-slate-700"
              >
                Período
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_auto]">
                <select
                  id="dashboard-period"
                  name="periodo"
                  defaultValue={selectedPeriod}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  name="dataInicial"
                  defaultValue={customStartDate}
                  aria-label="Data inicial"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                />
                <input
                  type="date"
                  name="dataFinal"
                  defaultValue={customEndDate}
                  aria-label="Data final"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
                >
                  Aplicar
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {periodCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
              >
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <strong className="mt-4 block text-2xl font-semibold text-[#17352b]">
                  {card.value}
                </strong>
                <p className="mt-3 text-sm text-slate-500">{card.detail}</p>
              </article>
            ))}
          </div>
        </section>

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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#17352b]">
                  Serviços não quitados
                </h2>
                <p className="text-sm text-slate-500">
                  Serviços com total recebido menor que o valor contratado.
                </p>
              </div>

              <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {dashboardData.servicosNaoQuitados} em aberto
              </span>
            </div>
          </div>

          {dashboardData.servicosNaoQuitadosLista.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-emerald-700">
                Nenhum serviço em aberto no momento
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Todos os serviços cadastrados estão quitados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Serviço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Valor contratado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Total recebido
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Valor em aberto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.servicosNaoQuitadosLista.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {service.nome_servico ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {getClientName(service)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatCurrency(service.valorContratado)}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-700">
                        {formatCurrency(service.totalRecebido)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-amber-700">
                        {formatCurrency(service.valorEmAberto)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {service.status ?? "Sem status"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,1))] shadow-[0_18px_40px_-24px_rgba(190,24,93,0.35)]">
          <div className="border-b border-rose-100 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-rose-900">
                  Serviços urgentes
                </h2>
                <p className="text-sm text-rose-700/80">
                  Serviços com prazo vencido que precisam de atenção imediata.
                </p>
              </div>

              <span className="inline-flex w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                {dashboardData.servicosAtrasados} em atraso
              </span>
            </div>
          </div>

          {dashboardData.servicosUrgentes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-emerald-700">
                Nenhum serviço vencido no momento
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver serviços com prazo vencido, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              {dashboardData.servicosUrgentes.map((service) => (
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#17352b]">
                Próximos prazos de serviços
              </h2>
              <p className="text-sm text-slate-500">
                Serviços abertos com vencimento mais próximo.
              </p>
            </div>
          </div>

          {dashboardData.proximosPrazos.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                Nenhum prazo próximo cadastrado
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver serviços em aberto com prazo final, eles aparecerão aqui.
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
                      Serviço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Prazo final
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.proximosPrazos.map((service) => (
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
      </div>
    </AppShell>
  );
}
