import {
  isDateInPeriod,
  type PeriodValue,
} from "./period-utils";
import { getUserDisplayMap } from "./user-profiles";

import {
  getDaysUntilSimpleDate,
  getSimpleDateTime,
  isBeforeTodayDateOnly,
  isTodayOrFutureDateOnly,
} from "./date-utils";
import { supabase } from "./supabase";
import { scopeQueryToOrganization } from "./organization-scope";

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
  responsavel_id: string | null;
};

export type PendingDashboardEntry = {
  id: number;
  servico_id: number | string | null;
  status: string | null;
  prioridade: string | null;
  responsavel_id: string | null;
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
  data_entrada: string | null;
  prazo_final: string | null;
  status: string | null;
  responsavel_id: string | null;
  situacao_operacional: string | null;
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
  servicosAtivos: number;
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
  carteiraPorResponsavel: DashboardResponsibleMetric[];
  gargalosOperacionais: DashboardOperationalQueueMetric[];
  prioridadesImediatas: DashboardPriorityMetric[];
  pendenciasAltasAbertas: number;
  metricasServicosPorTipo: DashboardServiceTypeMetric[];
  conversaoComercialPorTipo: DashboardCommercialConversionMetric[];
  conversaoComercialPorOrigem: DashboardCommercialConversionMetric[];
};

export type DashboardResponsibleMetric = {
  responsavel_id: string | null;
  responsavel_label: string;
  servicos_ativos: number;
  servicos_atrasados: number;
  tarefas_atrasadas: number;
  pendencias_altas: number;
};

export type DashboardOperationalQueueMetric = {
  chave: string;
  label: string;
  total: number;
  detalhe: string;
};

export type DashboardPriorityMetric = {
  chave: string;
  label: string;
  total: number;
  detalhe: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
};

export type DashboardServiceTypeMetric = {
  tipo_servico: string | null;
  quantidade_servicos_concluidos: number | null;
  servicos_com_tempo_calculavel: number | null;
  tempo_medio_dias: number | null;
  ticket_medio: number | null;
  servicos_com_margem_calculavel: number | null;
  margem_media: number | null;
  receita_media_recebida: number | null;
  despesa_media_paga: number | null;
};

export type DashboardCommercialConversionMetric = {
  dimensao: string | null;
  agrupador: string | null;
  total_propostas: number | null;
  propostas_ganhas: number | null;
  taxa_conversao: number | null;
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

function isResolvedPending(entry: PendingDashboardEntry) {
  return normalizeText(entry.status) === "resolvida";
}

function isHighPriorityPending(entry: PendingDashboardEntry) {
  return normalizeText(entry.prioridade) === "alta";
}

function getSituacaoOperacionalLabel(value: string | null) {
  switch (normalizeText(value)) {
    case "aguardando_cliente":
      return "Aguardando cliente";
    case "aguardando_orgao":
      return "Aguardando órgão";
    case "aguardando_cartorio":
      return "Aguardando cartório";
    case "aguardando_equipe":
      return "Aguardando equipe";
    case "pronto_para_protocolar":
      return "Pronto para protocolar";
    case "pronto_para_entregar":
      return "Pronto para entregar";
    case "em_execucao_ativa":
      return "Em execução ativa";
    default:
      return "Nao definida";
  }
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
  customEndDate: string,
  organizationId?: string | null,
  supabaseClient = supabase
): Promise<DashboardData> {
  const [
    clientsResult,
    servicesResult,
    financeiroResult,
    tasksResult,
    pendingsResult,
    serviceMetricsResult,
    commercialConversionResult,
  ] = await Promise.all([
    scopeQueryToOrganization(
      supabaseClient.from("clientes").select("id, created_at"),
      organizationId
    ),
    scopeQueryToOrganization(
      supabaseClient
      .from("servicos")
      .select(
        "id, cliente_id, nome_servico, valor, created_at, data_entrada, prazo_final, status, responsavel_id, situacao_operacional, cliente:clientes!servicos_cliente_same_organization_fkey(nome)"
      ),
      organizationId
    ),
    scopeQueryToOrganization(
      supabaseClient.from("financeiro").select("tipo, valor, status, data, servico_id"),
      organizationId
    ),
    scopeQueryToOrganization(
      supabaseClient.from("tarefas").select("id, data_limite, status, responsavel_id"),
      organizationId
    ),
    scopeQueryToOrganization(
      supabaseClient
      .from("servico_pendencias")
      .select("id, servico_id, status, prioridade, responsavel_id"),
      organizationId
    ),
    supabaseClient
      .from("vw_metricas_servicos_por_tipo")
      .select(
        "tipo_servico, quantidade_servicos_concluidos, servicos_com_tempo_calculavel, tempo_medio_dias, ticket_medio, servicos_com_margem_calculavel, margem_media, receita_media_recebida, despesa_media_paga"
      ),
    supabaseClient
      .from("vw_conversao_comercial")
      .select(
        "dimensao, agrupador, total_propostas, propostas_ganhas, taxa_conversao"
      ),
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

  if (pendingsResult.error) {
    console.error(
      "Erro ao buscar pendencias do painel:",
      pendingsResult.error.message
    );
  }

  if (serviceMetricsResult.error) {
    console.error(
      "Erro ao buscar metricas de servicos por tipo:",
      serviceMetricsResult.error.message
    );
  }

  if (commercialConversionResult.error) {
    console.error(
      "Erro ao buscar conversao comercial:",
      commercialConversionResult.error.message
    );
  }

  const clients = (clientsResult.data ?? []) as ClientDashboardEntry[];
  const services = (servicesResult.data ?? []) as ServiceDashboardEntry[];
  const financialEntries = (financeiroResult.data ?? []) as FinancialEntry[];
  const tasks = (tasksResult.data ?? []) as TaskDashboardEntry[];
  const pendings = (pendingsResult.data ?? []) as PendingDashboardEntry[];
  const serviceTypeMetrics =
    (serviceMetricsResult.data ?? []) as DashboardServiceTypeMetric[];
  const commercialConversionMetrics =
    (commercialConversionResult.data ??
      []) as DashboardCommercialConversionMetric[];
  const periodFinancialEntries = financialEntries.filter((entry) =>
    isDateInPeriod(entry.data, selectedPeriod, customStartDate, customEndDate)
  );

  const servicosAtrasados = services.filter(isPastDueService).length;
  const tarefasAtrasadas = tasks.filter(isPastDueTask).length;
  const pendenciasAltasAbertas = pendings.filter(
    (pending) => !isResolvedPending(pending) && isHighPriorityPending(pending)
  ).length;
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
      service.data_entrada ?? service.created_at,
      selectedPeriod,
      customStartDate,
      customEndDate
    )
  ).length;
  const servicosAtivos = services.filter(
    (service) => !isClosedServiceStatus(service.status)
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

  const userDisplayMap = await getUserDisplayMap([
    ...services.map((service) => service.responsavel_id),
    ...tasks.map((task) => task.responsavel_id),
    ...pendings.map((pending) => pending.responsavel_id),
  ], { organizationId }, supabaseClient);

  const carteiraPorResponsavelMap = new Map<string, DashboardResponsibleMetric>();

  function ensureResponsibleMetric(responsavelId: string | null | undefined) {
    const normalizedId = responsavelId?.trim() || null;
    const mapKey = normalizedId ?? "__sem_responsavel__";
    const existingMetric = carteiraPorResponsavelMap.get(mapKey);

    if (existingMetric) {
      return existingMetric;
    }

    const metric: DashboardResponsibleMetric = {
      responsavel_id: normalizedId,
      responsavel_label: normalizedId
        ? userDisplayMap[normalizedId] ?? "Responsavel nao identificado"
        : "Sem responsavel",
      servicos_ativos: 0,
      servicos_atrasados: 0,
      tarefas_atrasadas: 0,
      pendencias_altas: 0,
    };

    carteiraPorResponsavelMap.set(mapKey, metric);
    return metric;
  }

  services
    .filter((service) => !isClosedServiceStatus(service.status))
    .forEach((service) => {
      const metric = ensureResponsibleMetric(service.responsavel_id);
      metric.servicos_ativos += 1;

      if (isPastDueService(service)) {
        metric.servicos_atrasados += 1;
      }
    });

  tasks.filter(isPastDueTask).forEach((task) => {
    const metric = ensureResponsibleMetric(task.responsavel_id);
    metric.tarefas_atrasadas += 1;
  });

  pendings
    .filter((pending) => !isResolvedPending(pending) && isHighPriorityPending(pending))
    .forEach((pending) => {
      const metric = ensureResponsibleMetric(pending.responsavel_id);
      metric.pendencias_altas += 1;
    });

  const carteiraPorResponsavel = Array.from(
    carteiraPorResponsavelMap.values()
  )
    .filter(
      (metric) =>
        metric.servicos_ativos > 0 ||
        metric.servicos_atrasados > 0 ||
        metric.tarefas_atrasadas > 0 ||
        metric.pendencias_altas > 0
    )
    .sort((leftMetric, rightMetric) => {
      if (rightMetric.pendencias_altas !== leftMetric.pendencias_altas) {
        return rightMetric.pendencias_altas - leftMetric.pendencias_altas;
      }

      if (rightMetric.servicos_atrasados !== leftMetric.servicos_atrasados) {
        return rightMetric.servicos_atrasados - leftMetric.servicos_atrasados;
      }

      if (rightMetric.tarefas_atrasadas !== leftMetric.tarefas_atrasadas) {
        return rightMetric.tarefas_atrasadas - leftMetric.tarefas_atrasadas;
      }

      if (rightMetric.servicos_ativos !== leftMetric.servicos_ativos) {
        return rightMetric.servicos_ativos - leftMetric.servicos_ativos;
      }

      return leftMetric.responsavel_label.localeCompare(
        rightMetric.responsavel_label,
        "pt-BR"
      );
    })
    .slice(0, 5);

  const situacoesOperacionais = [
    {
      chave: "aguardando_cliente",
      detalhe: "Dependencias externas ainda com o cliente.",
    },
    {
      chave: "aguardando_orgao",
      detalhe: "Servicos aguardando retorno de orgao.",
    },
    {
      chave: "aguardando_cartorio",
      detalhe: "Fila operacional ligada a cartorio.",
    },
    {
      chave: "aguardando_equipe",
      detalhe: "Demanda aguardando acao interna da equipe.",
    },
    {
      chave: "pronto_para_protocolar",
      detalhe: "Itens aptos para protocolo.",
    },
    {
      chave: "pronto_para_entregar",
      detalhe: "Itens aptos para entrega ao cliente.",
    },
  ] as const;

  const gargalosOperacionais = situacoesOperacionais.map((situacao) => ({
    chave: situacao.chave,
    label: getSituacaoOperacionalLabel(situacao.chave),
    total: services.filter(
      (service) =>
        !isClosedServiceStatus(service.status) &&
        normalizeText(service.situacao_operacional) === situacao.chave
    ).length,
    detalhe: situacao.detalhe,
  }));

  const prioridadesImediatas: DashboardPriorityMetric[] = [
    {
      chave: "servicos_atrasados",
      label: "Serviços vencidos",
      total: servicosAtrasados,
      detalhe: "Carteira com prazo final já ultrapassado.",
      tone: "danger",
    },
    {
      chave: "pendencias_altas",
      label: "Pendências altas",
      total: pendenciasAltasAbertas,
      detalhe: "Bloqueios operacionais que pedem ação imediata.",
      tone: "danger",
    },
    {
      chave: "tarefas_atrasadas",
      label: "Tarefas vencidas",
      total: tarefasAtrasadas,
      detalhe: "Atividades que já passaram do prazo.",
      tone: "warning",
    },
    {
      chave: "pronto_para_protocolar",
      label: "Prontos para protocolar",
      total:
        gargalosOperacionais.find(
          (item) => item.chave === "pronto_para_protocolar"
        )?.total ?? 0,
      detalhe: "Serviços já aptos para protocolo.",
      tone: "info",
    },
    {
      chave: "pronto_para_entregar",
      label: "Prontos para entregar",
      total:
        gargalosOperacionais.find(
          (item) => item.chave === "pronto_para_entregar"
        )?.total ?? 0,
      detalhe: "Serviços que já podem virar entrega final.",
      tone: "success",
    },
  ];

  return {
    clientesNovos,
    servicosCriados,
    servicosAtivos,
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
    carteiraPorResponsavel,
    gargalosOperacionais,
    prioridadesImediatas,
    pendenciasAltasAbertas,
    metricasServicosPorTipo: serviceTypeMetrics,
    conversaoComercialPorTipo: commercialConversionMetrics.filter(
      (metric) => normalizeText(metric.dimensao) === "tipo_servico"
    ),
    conversaoComercialPorOrigem: commercialConversionMetrics.filter(
      (metric) => normalizeText(metric.dimensao) === "origem"
    ),
  };
}


