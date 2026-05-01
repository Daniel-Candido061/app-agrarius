import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import {
  formatSimpleDate,
  getElapsedDaysBetweenDateTimes,
  getElapsedDaysFromDateTime,
  isBeforeTodayDateOnly,
} from "../../../lib/date-utils";
import { requireAuth } from "../../../lib/auth";
import { requireCurrentOrganization } from "../../../lib/organization-context";
import { scopeQueryToOrganization } from "../../../lib/organization-scope";
import { getSupabaseServerClient } from "../../../lib/supabase-server";
import {
  getCurrentUserShellProfile,
  getUserDisplayMap,
  getUserLabel,
  getUserOptions,
} from "../../../lib/user-profiles";
import type {
  Servico,
  ServicoDocumento,
  ServicoEtapa,
  ServicoEvento,
  ServicoFinanceiro,
  ServicoPendencia,
} from "../types";
import {
  getNextUnfinishedStage,
  getMostRelevantOpenPending,
  getPendingPriorityLabel,
  getServiceOperationalFocus,
  isClosedServiceStatus,
  getServiceDeadlineAlert,
  getServiceNextStepSummary,
  getSituacaoOperacionalClassName,
  getSituacaoOperacionalLabel,
  isCompletedStageStatus,
  isPendingStale,
  isResolvedPendingStatus,
  normalizeOperationalText,
} from "../operational-utils";
import type { Tarefa } from "../../tarefas/types";
import { ServiceDocumentsSection } from "./service-documents-section";
import { ServiceDetailTabs } from "./service-detail-tabs";
import { ServicePendingsSection } from "./service-pendings-section";
import { ServiceStagesSection } from "./service-stages-section";
import { ServiceTasksSection } from "./service-tasks-section";
import { ServiceTimelineSection } from "./service-timeline-section";

type ServiceSummaryCard = {
  title: string;
  value: string;
  detail: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  valueClassName?: string;
};

function formatCurrency(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue);
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

function normalizeText(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function isRevenue(entry: ServicoFinanceiro) {
  return normalizeText(entry.tipo) === "receita";
}

function isExpense(entry: ServicoFinanceiro) {
  return normalizeText(entry.tipo) === "despesa";
}

function isReceived(entry: ServicoFinanceiro) {
  return normalizeText(entry.status) === "recebido";
}

function isPaid(entry: ServicoFinanceiro) {
  return normalizeText(entry.status) === "pago";
}

function getServiceStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "proposta") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "em andamento") {
    return "bg-sky-50 text-sky-700";
  }

  if (normalizedStatus === "protocolado") {
    return "bg-violet-50 text-violet-700";
  }

  if (normalizedStatus === "entregue") {
    return "bg-teal-50 text-teal-700";
  }

  if (normalizedStatus === "concluido") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "cancelado") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getFinancialStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "recebido" || normalizedStatus === "pago") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "pendente") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "vencido") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getEntryTypeClassName(type: string | null) {
  const normalizedType = normalizeText(type);

  if (normalizedType === "receita") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedType === "despesa") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getClientName(service: Servico) {
  if (Array.isArray(service.cliente)) {
    return service.cliente[0]?.nome ?? "Cliente não encontrado";
  }

  return service.cliente?.nome ?? "Cliente não encontrado";
}

function isConcludedServiceStatus(status: string | null | undefined) {
  return normalizeText(status) === "concluido";
}

function getFocusToneClassName(tone: "danger" | "warning" | "neutral" | "success" | "info") {
  switch (tone) {
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "info":
      return "border-cyan-200 bg-cyan-50 text-cyan-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function isCompletedTask(status: string | null | undefined) {
  const normalizedStatus = normalizeText(status);
  return normalizedStatus === "concluida" || normalizedStatus === "concluido";
}

function getFirstCompletionDate(
  events: ServicoEvento[]
) {
  const completionEvent = [...events]
    .filter((event) => {
      const normalizedTitle = normalizeText(event.titulo);
      const normalizedDescription = normalizeText(event.descricao);

      return (
        normalizedTitle === "status atualizado" &&
        normalizedDescription.includes("status alterado para concluido")
      );
    })
    .sort((leftEvent, rightEvent) => {
      const leftTime = leftEvent.created_at
        ? new Date(leftEvent.created_at).getTime()
        : Number.POSITIVE_INFINITY;
      const rightTime = rightEvent.created_at
        ? new Date(rightEvent.created_at).getTime()
        : Number.POSITIVE_INFINITY;

      return leftTime - rightTime;
    })[0];

  if (completionEvent?.created_at) {
    return completionEvent.created_at;
  }

  return null;
}

async function getServico(id: number, organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servicos")
      .select(
        "id, organization_id, cliente_id, created_at, criado_por, atualizado_por, responsavel_id, data_entrada, nome_servico, tipo_servico, situacao_operacional, cidade, valor, prazo, prazo_final, observacoes, status, cliente:clientes!servicos_cliente_same_organization_fkey(id, nome)"
      )
      .eq("id", id)
      .maybeSingle(),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar serviço:", error.message);
    return null;
  }

  return (data ?? null) as Servico | null;
}

async function getEtapasDoServico(id: number, organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servico_etapas")
      .select("id, organization_id, servico_id, titulo, status, ordem, opcional, created_at")
      .eq("servico_id", id)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar etapas do serviço:", error.message);
    return [];
  }

  return (data ?? []) as ServicoEtapa[];
}

async function getPendenciasDoServico(
  id: number,
  organizationId?: string | null
) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servico_pendencias")
      .select("id, organization_id, servico_id, titulo, origem, prioridade, prazo_resposta, status, observacao, created_at, updated_at, criado_por, atualizado_por, responsavel_id")
      .eq("servico_id", id)
      .order("created_at", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar pendências do serviço:", error.message);
    return [];
  }

  return (data ?? []) as ServicoPendencia[];
}

async function getEventosDoServico(id: number, organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servico_eventos")
      .select("id, organization_id, servico_id, tipo, titulo, descricao, created_at, criado_por")
      .eq("servico_id", id)
      .order("created_at", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar eventos do serviço:", error.message);
    return [];
  }

  return (data ?? []) as ServicoEvento[];
}

async function getDocumentosDoServico(
  id: number,
  organizationId?: string | null
) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servico_documentos")
      .select(
        "id, organization_id, servico_id, nome_original, nome_arquivo, caminho_storage, tipo_mime, tamanho_bytes, observacao, criado_em, criado_por, atualizado_por"
      )
      .eq("servico_id", id)
      .order("criado_em", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar documentos do serviço:", error.message);
    return [];
  }

  return (data ?? []) as ServicoDocumento[];
}

async function getLancamentosDoServico(
  id: number,
  organizationId?: string | null
) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("financeiro")
      .select("id, organization_id, tipo, categoria, descricao, valor, data, servico_id, status, criado_por, atualizado_por, responsavel_id")
      .eq("servico_id", id)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar financeiro do serviço:", error.message);
    return [];
  }

  return (data ?? []) as ServicoFinanceiro[];
}

async function getTarefasDoServico(id: number, organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("tarefas")
      .select("id, organization_id, titulo, servico_id, responsavel, responsavel_id, data_limite, prioridade, status, observacao, criado_por, atualizado_por")
      .eq("servico_id", id)
      .order("data_limite", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar tarefas do serviço:", error.message);
    return [];
  }

  return (data ?? []) as Tarefa[];
}

export default async function ServicoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const authenticatedUser = await requireAuth();
  const supabaseServer = await getSupabaseServerClient();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );
  const [currentUserProfile, userOptions] = await Promise.all([
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }, supabaseServer),
    getUserOptions({
      currentUserId: authenticatedUser.id,
      currentUserEmail: authenticatedUser.email,
      organizationId: organizationContext.organizationId,
    }, supabaseServer),
  ]);

  const { id } = await params;
  const serviceId = Number(id);

  if (Number.isNaN(serviceId)) {
    notFound();
  }

  const [service, financialEntries, tasks, stages, pendings, events, documents] = await Promise.all([
    getServico(serviceId, organizationContext.organizationId),
    getLancamentosDoServico(serviceId, organizationContext.organizationId),
    getTarefasDoServico(serviceId, organizationContext.organizationId),
    getEtapasDoServico(serviceId, organizationContext.organizationId),
    getPendenciasDoServico(serviceId, organizationContext.organizationId),
    getEventosDoServico(serviceId, organizationContext.organizationId),
    getDocumentosDoServico(serviceId, organizationContext.organizationId),
  ]);

  if (!service) {
    notFound();
  }
  const userDisplayNames = await getUserDisplayMap([
    service.responsavel_id,
    service.criado_por,
    service.atualizado_por,
    ...tasks.flatMap((task) => [task.responsavel_id, task.criado_por, task.atualizado_por]),
    ...pendings.flatMap((pending) => [
      pending.responsavel_id,
      pending.criado_por,
      pending.atualizado_por,
    ]),
    ...events.map((event) => event.criado_por),
    ...documents.flatMap((document) => [document.criado_por, document.atualizado_por]),
  ], { organizationId: organizationContext.organizationId }, supabaseServer);
  const serviceResponsibleLabel = getUserLabel(
    userDisplayNames,
    service.responsavel_id
  );
  const serviceCreatedByLabel = getUserLabel(
    userDisplayNames,
    service.criado_por
  );
  const serviceUpdatedByLabel = getUserLabel(
    userDisplayNames,
    service.atualizado_por
  );

  const valorContratado = getNumericValue(service.valor);

  const totalRecebido = financialEntries
    .filter((entry) => isRevenue(entry) && isReceived(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const valorAReceber = valorContratado - totalRecebido;

  const totalDespesasPagas = financialEntries
    .filter((entry) => isExpense(entry) && isPaid(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const totalDespesasVinculadas = financialEntries
    .filter(isExpense)
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const lucroLiquidoRealizado = totalRecebido - totalDespesasPagas;
  const totalLancamentos = financialEntries.length;
  const dataConclusao = getFirstCompletionDate(events);
  const nextStage = getNextUnfinishedStage(stages);
  const resolvedStagesCount = stages.filter((stage) =>
    isCompletedStageStatus(stage.status)
  ).length;
  const openPendings = pendings.filter(
    (pending) => !isResolvedPendingStatus(pending.status)
  );
  const staleOpenPendings = openPendings.filter((pending) =>
    isPendingStale(pending)
  );
  const highPriorityOpenPendings = openPendings.filter(
    (pending) => normalizeOperationalText(pending.prioridade) === "alta"
  );
  const overduePendings = openPendings.filter(
    (pending) => pending.prazo_resposta && isBeforeTodayDateOnly(pending.prazo_resposta)
  );
  const pendingTasks = tasks.filter((task) => !isCompletedTask(task.status));
  const overdueTasks = pendingTasks.filter(
    (task) => task.data_limite && isBeforeTodayDateOnly(task.data_limite)
  );
  const relevantPending = getMostRelevantOpenPending(pendings);
  const nextActionSummary = getServiceNextStepSummary({ pendings, stages });
  const operationalFocus = getServiceOperationalFocus({
    situacaoOperacional: service.situacao_operacional,
    status: service.status,
    prazoFinal: service.prazo_final,
    pendings,
    stages,
  });
  const deadlineAlert = getServiceDeadlineAlert({
    prazoFinal: service.prazo_final,
    status: service.status,
  });
  const serviceEntryDateLabel = service.data_entrada ?? service.created_at;
  const serviceEntryDateTime = service.data_entrada
    ? `${service.data_entrada}T12:00:00`
    : service.created_at;
  const tempoEmAndamentoEmDias =
    dataConclusao === null && !isConcludedServiceStatus(service.status)
      ? getElapsedDaysFromDateTime(serviceEntryDateTime)
      : null;
  const tempoExecucaoEmDias = getElapsedDaysBetweenDateTimes(
    serviceEntryDateTime,
    dataConclusao
  );
  const executionTimeLabel =
    tempoExecucaoEmDias === null
      ? tempoEmAndamentoEmDias === null
        ? "-"
        : `Em andamento há ${tempoEmAndamentoEmDias} dia${
            tempoEmAndamentoEmDias === 1 ? "" : "s"
          }`
      : `${tempoExecucaoEmDias} dia${tempoExecucaoEmDias === 1 ? "" : "s"}`;
  const deadlineSummaryLabel = deadlineAlert
    ? deadlineAlert.label
    : service.prazo_final
      ? `Entrega prevista em ${formatSimpleDate(service.prazo_final)}`
      : "Prazo de entrega não informado";
  const quickOverviewCards: ServiceSummaryCard[] = [
    {
      title: "Prazo",
      value: deadlineAlert?.label ?? "Dentro do previsto",
      detail: service.prazo_final
        ? `Entrega prevista para ${formatSimpleDate(service.prazo_final)}.`
        : "Prazo final ainda não informado.",
      tone:
        deadlineAlert?.tone === "danger"
          ? ("danger" as const)
          : deadlineAlert?.tone === "warning"
            ? ("warning" as const)
            : ("success" as const),
    },
    {
      title: "Pendências",
      value: String(openPendings.length),
      detail:
        highPriorityOpenPendings.length > 0
          ? `${highPriorityOpenPendings.length} em alta prioridade.`
          : staleOpenPendings.length > 0
            ? `${staleOpenPendings.length} sem atualização recente.`
            : overduePendings.length > 0
              ? `${overduePendings.length} passaram do prazo de resposta.`
              : "Sem bloqueios relevantes no momento.",
      tone:
        highPriorityOpenPendings.length > 0 || overduePendings.length > 0
          ? ("danger" as const)
          : staleOpenPendings.length > 0 || openPendings.length > 0
            ? ("warning" as const)
            : ("success" as const),
    },
    {
      title: "Tarefas",
      value: String(pendingTasks.length),
      detail:
        overdueTasks.length > 0
          ? `${overdueTasks.length} atrasada(s).`
          : pendingTasks.length > 0
            ? "Execução em andamento."
            : "Nada pendente nesta frente.",
      tone:
        overdueTasks.length > 0
          ? ("warning" as const)
          : pendingTasks.length > 0
            ? ("info" as const)
            : ("success" as const),
    },
    {
      title: "Financeiro",
      value:
        valorAReceber > 0
          ? formatCurrency(valorAReceber)
          : "Quitado",
      detail:
        valorAReceber > 0
          ? "Valor ainda em aberto neste serviço."
          : `Recebido: ${formatCurrency(totalRecebido)}.`,
      tone: valorAReceber > 0 ? ("warning" as const) : ("success" as const),
    },
  ];

  const financialSummaryCards: ServiceSummaryCard[] = [
    {
      title: "Total recebido",
      value: formatCurrency(totalRecebido),
      detail: "Receitas já recebidas neste serviço.",
      tone: "success",
    },
    {
      title: "Valor em aberto",
      value: formatCurrency(valorAReceber),
      detail:
        valorAReceber > 0
          ? "Ainda existe valor pendente de recebimento."
          : "Nenhum valor pendente no momento.",
      tone: valorAReceber > 0 ? "warning" : "success",
    },
    {
      title: "Despesas vinculadas",
      value: formatCurrency(totalDespesasVinculadas),
      detail: `Resultado realizado até agora: ${formatCurrency(lucroLiquidoRealizado)}.`,
      tone:
        lucroLiquidoRealizado >= 0
          ? "neutral"
          : "danger",
      valueClassName:
        lucroLiquidoRealizado >= 0 ? "text-[#163728]" : "text-rose-700",
    },
  ];

  return (
    <AppShell
      title="Detalhes do serviço"
      description="Resumo do serviço, do cliente vinculado e do financeiro relacionado."
      currentPath="/servicos"
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
      action={
        <Link
          href="/servicos"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Voltar
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Serviço</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#17352b]">
                {service.nome_servico ?? "-"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {getClientName(service)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusClassName(
                  service.status
                )}`}
              >
                {service.status ?? "Sem status"}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSituacaoOperacionalClassName(
                  service.situacao_operacional
                )}`}
              >
                {getSituacaoOperacionalLabel(service.situacao_operacional)}
              </span>
            </div>
          </div>

          <div
            className={`mt-5 rounded-2xl border px-4 py-4 ${getFocusToneClassName(
              operationalFocus.tone
            )}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Próximo passo
            </p>
            <p className="mt-2 text-lg font-semibold">
              {nextActionSummary}
            </p>
            <p className="mt-2 text-sm opacity-90">
              {operationalFocus.detail}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Responsável
              </p>
              <p className="mt-2 text-sm font-medium text-[#17352b]">
                {serviceResponsibleLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Prazo
              </p>
              <p className="mt-2 text-sm font-medium text-[#17352b]">
                {deadlineSummaryLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Pendências abertas
              </p>
              <p className="mt-2 text-sm font-medium text-[#17352b]">
                {openPendings.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Tarefas pendentes
              </p>
              <p className="mt-2 text-sm font-medium text-[#17352b]">
                {pendingTasks.length}
              </p>
            </div>
          </div>

          {service.observacoes?.trim() ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Observação
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                {service.observacoes.trim()}
              </p>
            </div>
          ) : null}
        </section>

        <ServiceDetailTabs
          execution={
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
                <h3 className="text-lg font-semibold text-[#17352b]">
                  Como este serviço se organiza
                </h3>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Etapas
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Mostram a fase do serviço dentro do fluxo principal.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Pendências
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Registram bloqueios, retornos e dependências externas.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Tarefas
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      São ações internas com responsável e prazo para execução.
                    </p>
                  </div>
                </div>
              </section>

              <ServiceStagesSection
                serviceId={serviceId}
                stages={stages}
                currentUserId={authenticatedUser.id}
                currentOrganizationId={organizationContext.organizationId}
              />

              <ServicePendingsSection
                serviceId={serviceId}
                serviceType={service.tipo_servico}
                pendings={pendings}
                currentUserId={authenticatedUser.id}
                currentOrganizationId={organizationContext.organizationId}
                userDisplayNames={userDisplayNames}
                userOptions={userOptions}
              />

              <ServiceTasksSection
                serviceId={serviceId}
                tasks={tasks}
                currentUserId={authenticatedUser.id}
                currentOrganizationId={organizationContext.organizationId}
                userDisplayNames={userDisplayNames}
                userOptions={userOptions}
              />
            </div>
          }
          documents={
            <ServiceDocumentsSection
              serviceId={serviceId}
              documents={documents}
              currentUserId={authenticatedUser.id}
              currentOrganizationId={organizationContext.organizationId}
              userDisplayNames={userDisplayNames}
            />
          }
          finance={
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#17352b]">
                      Financeiro do serviço
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Valores e lançamentos vinculados diretamente a este serviço.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {financialSummaryCards.map((card) => (
                      <span
                        key={card.title}
                        className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-slate-700"
                      >
                        {card.title}: {card.value}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {financialEntries.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h2 className="text-lg font-semibold text-[#17352b]">
                    Nenhum lançamento vinculado
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Este serviço ainda não possui receitas ou despesas cadastradas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Tipo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Descrição
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Valor
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Data
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {financialEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className={`hover:bg-slate-50/80 ${
                            entry.tipo?.toLowerCase() === "receita"
                              ? "bg-emerald-50/30"
                              : entry.tipo?.toLowerCase() === "despesa"
                                ? "bg-rose-50/30"
                                : ""
                          }`}
                        >
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getEntryTypeClassName(
                                entry.tipo
                              )}`}
                            >
                              {entry.tipo ?? "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {entry.descricao ?? entry.categoria ?? "-"}
                          </td>
                          <td
                            className={`px-6 py-4 text-sm font-medium ${
                              entry.tipo?.toLowerCase() === "receita"
                                ? "text-emerald-700"
                                : entry.tipo?.toLowerCase() === "despesa"
                                  ? "text-rose-700"
                                  : "text-slate-500"
                            }`}
                          >
                            {formatCurrency(entry.valor)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {formatSimpleDate(entry.data)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getFinancialStatusClassName(
                                entry.status
                              )}`}
                            >
                              {entry.status ?? "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          }
          history={
            <ServiceTimelineSection
              serviceId={serviceId}
              events={events}
              currentUserId={authenticatedUser.id}
              currentOrganizationId={organizationContext.organizationId}
              userDisplayNames={userDisplayNames}
            />
          }
        />
      </div>
    </AppShell>
  );
}




