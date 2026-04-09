import {
  isDateInPeriod,
  type PeriodValue,
} from "./period-utils";
import {
  getDaysUntilSimpleDate,
  getSimpleDateTime,
  isBeforeTodayDateOnly,
  isTodayOrFutureDateOnly,
} from "./date-utils";
import { supabase } from "./supabase";

export type FinancialEntry = {
  tipo: string | null;
  valor: number | string | null;
  status: string | null;
  data: string | null;
  servico_id: number | string | null;
};

export type TaskDashboardEntry = {
  id: number;
  data_limite: string | null;
  status: string | null;
};

export type ClientDashboardEntry = {
  id: number;
  created_at: string | null;
};

export type ServiceDashboardEntry = {
  id: number;
  cliente_id: number | string | null;
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

export type DashboardData = {
  clientesNovos: number;
  servicosCriados: number;
  totalRecebidoPeriodo: number;
  despesasPagasPeriodo: number;
  lucroRealizadoPeriodo: number;
  clientesComServicosEmAndamento: number;
  servicosAtrasados: number;
  tarefasAtrasadas: number;
  totalAReceber: number;
  servicosNaoQuitados: number;
  servicosNaoQuitadosLista: Array<
    ServiceDashboardEntry & {
      totalRecebido: number;
      valorEmAberto: number;
    }
  >;
  servicosUrgentes: ServiceDashboardEntry[];
  proximosPrazos: Array<
    ServiceDashboardEntry & {
      valorEmAberto: number;
    }
  >;
};

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

export function getClientName(entry: ServiceDashboardEntry) {
  if (Array.isArray(entry.cliente)) {
    return entry.cliente[0]?.nome ?? "Cliente nao encontrado";
  }

  return entry.cliente?.nome ?? "Cliente nao encontrado";
}

export function getDaysUntilDeadline(value: string | null) {
  if (!value) {
    return null;
  }

  return getDaysUntilSimpleDate(value);
}

export async function getDashboardData(
  selectedPeriod: PeriodValue,
  customStartDate: string,
  customEndDate: string
): Promise<DashboardData> {
  const [
    clientsResult,
    servicesResult,
    financeiroResult,
    tasksResult,
  ] = await Promise.all([
    supabase.from("clientes").select("id, created_at"),
    supabase
      .from("servicos")
      .select("id, cliente_id, nome_servico, valor, created_at, prazo_final, status, cliente:clientes(nome)"),
    supabase.from("financeiro").select("tipo, valor, status, data, servico_id"),
    supabase.from("tarefas").select("id, data_limite, status"),
  ]);

  if (clientsResult.error) {
    console.error("Erro ao buscar clientes do painel:", clientsResult.error.message);
  }

  if (servicesResult.error) {
    console.error("Erro ao buscar servicos do painel:", servicesResult.error.message);
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
  const clientesComServicosEmAndamento = new Set(
    services
      .filter((service) => normalizeText(service.status) === "em andamento")
      .map((service) => service.cliente_id)
      .filter((clientId) => clientId !== null && clientId !== undefined)
      .map(String)
  ).size;

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
    .slice(0, 5)
    .map((service) => {
      const valorContratado = getNumericValue(service.valor);
      const recebido = receivedByServiceId.get(String(service.id)) ?? 0;

      return {
        ...service,
        valorEmAberto: valorContratado - recebido,
      };
    });

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
    clientesComServicosEmAndamento,
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
          totalRecebido: recebido,
          valorEmAberto: valorContratado - recebido,
        };
      })
      .sort(
        (firstService, secondService) =>
          secondService.valorEmAberto - firstService.valorEmAberto
      )
      .slice(0, 3),
    servicosUrgentes,
    proximosPrazos,
  };
}
