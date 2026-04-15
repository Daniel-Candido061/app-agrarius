import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { SummaryCard, SummaryCardsGrid } from "../../components/summary-card";
import {
  formatSimpleDate,
  getElapsedDaysBetweenDateTimes,
  getElapsedDaysFromDateTime,
  isBeforeTodayDateOnly,
} from "../../../lib/date-utils";
import { requireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import {
  getCurrentUserShellProfile,
  getUserDisplayMap,
  getUserLabel,
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
import { ServicePendingsSection } from "./service-pendings-section";
import { ServiceStagesSection } from "./service-stages-section";
import { ServiceTasksSection } from "./service-tasks-section";
import { ServiceTimelineSection } from "./service-timeline-section";

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
    return service.cliente[0]?.nome ?? "Cliente nao encontrado";
  }

  return service.cliente?.nome ?? "Cliente nao encontrado";
}

function isConcludedServiceStatus(status: string | null | undefined) {
  return normalizeText(status) === "concluido";
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

async function getServico(id: number) {
  const { data, error } = await supabase
    .from("servicos")
    .select(
      "id, cliente_id, created_at, criado_por, atualizado_por, responsavel_id, data_entrada, nome_servico, tipo_servico, situacao_operacional, cidade, valor, prazo, prazo_final, observacoes, status, cliente:clientes(id, nome)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar servico:", error.message);
    return null;
  }

  return (data ?? null) as Servico | null;
}

async function getEtapasDoServico(id: number) {
  const { data, error } = await supabase
    .from("servico_etapas")
    .select("id, servico_id, titulo, status, ordem, opcional, created_at")
    .eq("servico_id", id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar etapas do servico:", error.message);
    return [];
  }

  return (data ?? []) as ServicoEtapa[];
}

async function getPendenciasDoServico(id: number) {
  const { data, error } = await supabase
    .from("servico_pendencias")
    .select("id, servico_id, titulo, origem, prioridade, prazo_resposta, status, observacao, created_at, updated_at, criado_por, atualizado_por, responsavel_id")
    .eq("servico_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar pendencias do servico:", error.message);
    return [];
  }

  return (data ?? []) as ServicoPendencia[];
}

async function getEventosDoServico(id: number) {
  const { data, error } = await supabase
    .from("servico_eventos")
    .select("id, servico_id, tipo, titulo, descricao, created_at, criado_por")
    .eq("servico_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar eventos do servico:", error.message);
    return [];
  }

  return (data ?? []) as ServicoEvento[];
}

async function getDocumentosDoServico(id: number) {
  const { data, error } = await supabase
    .from("servico_documentos")
    .select(
      "id, servico_id, nome_original, nome_arquivo, caminho_storage, tipo_mime, tamanho_bytes, observacao, criado_em, criado_por, atualizado_por"
    )
    .eq("servico_id", id)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar documentos do servico:", error.message);
    return [];
  }

  return (data ?? []) as ServicoDocumento[];
}

async function getLancamentosDoServico(id: number) {
  const { data, error } = await supabase
    .from("financeiro")
    .select("id, tipo, categoria, descricao, valor, data, servico_id, status, criado_por, atualizado_por, responsavel_id")
    .eq("servico_id", id)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar financeiro do servico:", error.message);
    return [];
  }

  return (data ?? []) as ServicoFinanceiro[];
}

async function getTarefasDoServico(id: number) {
  const { data, error } = await supabase
    .from("tarefas")
    .select("id, titulo, servico_id, responsavel, responsavel_id, data_limite, prioridade, status, observacao, criado_por, atualizado_por")
    .eq("servico_id", id)
    .order("data_limite", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar tarefas do servico:", error.message);
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
  const currentUserProfile = await getCurrentUserShellProfile({
    userId: authenticatedUser.id,
    email: authenticatedUser.email,
  });

  const { id } = await params;
  const serviceId = Number(id);

  if (Number.isNaN(serviceId)) {
    notFound();
  }

  const [service, financialEntries, tasks, stages, pendings, events, documents] = await Promise.all([
    getServico(serviceId),
    getLancamentosDoServico(serviceId),
    getTarefasDoServico(serviceId),
    getEtapasDoServico(serviceId),
    getPendenciasDoServico(serviceId),
    getEventosDoServico(serviceId),
    getDocumentosDoServico(serviceId),
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
  ]);
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

  const financialSummaryCards = [
    {
      title: "Total recebido",
      value: formatCurrency(totalRecebido),
      detail: "Receitas recebidas vinculadas ao servico.",
      tone: "success" as const,
      valueClassName: "text-[#163728]",
    },
    {
      title: "Valor a receber",
      value: formatCurrency(valorAReceber),
      detail: "Valor contratado menos o total recebido.",
      tone: valorAReceber >= 0 ? ("warning" as const) : ("danger" as const),
      valueClassName: valorAReceber >= 0 ? "text-[#163728]" : "text-rose-700",
    },
    {
      title: "Despesas vinculadas",
      value: formatCurrency(totalDespesasVinculadas),
      detail: "Todas as despesas lancadas para este servico.",
      tone: "warning" as const,
      valueClassName: "text-[#163728]",
    },
    {
      title: "Lucro liquido realizado",
      value: formatCurrency(lucroLiquidoRealizado),
      detail: "Total recebido menos despesas pagas.",
      tone:
        lucroLiquidoRealizado >= 0
          ? ("success" as const)
          : ("danger" as const),
      valueClassName:
        lucroLiquidoRealizado >= 0 ? "text-[#163728]" : "text-rose-700",
    },
  ];

  const operationalSummaryCards = [
    {
      title: "Etapas concluidas",
      value: `${resolvedStagesCount}/${stages.length || 0}`,
      detail: stages.length
        ? "Quantidade de etapas finalizadas no fluxo tecnico."
        : "Nenhuma etapa cadastrada para este servico.",
      tone: "info" as const,
    },
    {
      title: "Pendencias abertas",
      value: String(openPendings.length),
      detail:
        highPriorityOpenPendings.length > 0
          ? `${highPriorityOpenPendings.length} pendencia(s) alta bloqueando o fluxo operacional.`
          : staleOpenPendings.length > 0
            ? `${staleOpenPendings.length} pendencia(s) estao paradas ha mais de 10 dias.`
          : relevantPending
            ? `Mais relevante: ${relevantPending.titulo ?? "Pendencia aberta"} (${getPendingPriorityLabel(
                relevantPending.prioridade
              )}).`
          : overduePendings.length > 0
            ? `${overduePendings.length} pendencia(s) ja passaram do prazo de resposta.`
          : "Itens aguardando retorno de cliente, cartorio ou orgao.",
      tone:
        highPriorityOpenPendings.length > 0 ||
        overduePendings.length > 0 ||
        staleOpenPendings.length > 0
          ? ("danger" as const)
          : ("warning" as const),
    },
    {
      title: "Tarefas pendentes",
      value: String(pendingTasks.length),
      detail:
        overdueTasks.length > 0
          ? `${overdueTasks.length} tarefa(s) estao atrasadas.`
          : "Execucoes ainda nao concluidas neste servico.",
      tone: overdueTasks.length > 0 ? ("warning" as const) : ("neutral" as const),
    },
    {
      title: "Proxima etapa",
      value:
        deadlineAlert?.label ??
        nextStage?.titulo ??
        (isClosedServiceStatus(service.status)
          ? "Servico concluido"
          : "Definir proxima acao"),
      detail: deadlineAlert
        ? `Entrega prevista para ${formatSimpleDate(service.prazo_final)}.`
        : nextStage
        ? `${nextStage.opcional ? "Etapa opcional. " : ""}Status atual: ${
            nextStage.status ?? "Pendente"
          }.`
        : "Fluxo tecnico sem etapas em aberto no momento.",
      tone:
        deadlineAlert?.tone === "danger"
          ? ("danger" as const)
          : deadlineAlert?.tone === "warning"
            ? ("warning" as const)
            : ("success" as const),
      valueClassName: "text-[#163728] text-[1.35rem] leading-tight sm:text-[1.5rem]",
    },
  ];

  return (
    <AppShell
      title="Detalhes do servico"
      description="Resumo do servico, do cliente vinculado e do financeiro relacionado."
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
        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Servico</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#17352b]">
                  {service.nome_servico ?? "-"}
                </h2>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusClassName(
                  service.status
                )}`}
              >
                {service.status ?? "Sem status"}
              </span>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Cliente
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {getClientName(service)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Cidade
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {service.cidade ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Tipo de servico
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {service.tipo_servico ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Situacao operacional
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSituacaoOperacionalClassName(
                      service.situacao_operacional
                    )}`}
                  >
                    {getSituacaoOperacionalLabel(service.situacao_operacional)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Valor contratado
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatCurrency(service.valor)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Data de entrada
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatSimpleDate(serviceEntryDateLabel)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Responsavel
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {serviceResponsibleLabel}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Prazo de entrega
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatSimpleDate(service.prazo_final)}
                </p>
              </div>

              <div className="sm:col-span-2 xl:col-span-3">
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Data de conclusao
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {dataConclusao ? formatSimpleDate(dataConclusao) : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Tempo de execucao
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {tempoExecucaoEmDias === null
                        ? tempoEmAndamentoEmDias === null
                          ? "-"
                          : `Em andamento ha ${tempoEmAndamentoEmDias} dia${
                              tempoEmAndamentoEmDias === 1 ? "" : "s"
                            }`
                        : `${tempoExecucaoEmDias} dia${
                            tempoExecucaoEmDias === 1 ? "" : "s"
                          }`}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Situacao do prazo
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {service.prazo_final
                        ? `Entrega prevista em ${formatSimpleDate(service.prazo_final)}`
                        : "Prazo de entrega nao informado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Criado por
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {serviceCreatedByLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Atualizado por
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {serviceUpdatedByLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 xl:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Observacao
                </p>
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {service.observacoes?.trim() || "Sem observacoes"}
                </p>
              </div>
            </div>
          </article>

          <SummaryCardsGrid className="md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            {financialSummaryCards.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                tone={card.tone}
                valueClassName={card.valueClassName}
                compact
              />
            ))}
          </SummaryCardsGrid>
        </section>

        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#17352b]">
                  Visao operacional
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Leitura rapida do que esta travando e do proximo passo recomendado para este servico.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Proximo passo
                </p>
                <p className="mt-2 font-medium text-[#17352b]">
                  {nextActionSummary}
                </p>
                {highPriorityOpenPendings.length > 0 ? (
                  <p className="mt-2 text-xs font-medium text-rose-700">
                    Existe pendencia alta aberta com impacto bloqueador.
                  </p>
                ) : null}
              </div>
            </div>
          </article>

          <SummaryCardsGrid className="md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            {operationalSummaryCards.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                tone={card.tone}
                valueClassName={card.valueClassName}
                compact
              />
            ))}
          </SummaryCardsGrid>
        </section>

        <ServiceStagesSection
          serviceId={serviceId}
          stages={stages}
          currentUserId={authenticatedUser.id}
        />

        <ServiceDocumentsSection
          serviceId={serviceId}
          documents={documents}
          currentUserId={authenticatedUser.id}
          userDisplayNames={userDisplayNames}
        />

        <ServicePendingsSection
          serviceId={serviceId}
          serviceType={service.tipo_servico}
          pendings={pendings}
          currentUserId={authenticatedUser.id}
          userDisplayNames={userDisplayNames}
        />

        <ServiceTasksSection
          serviceId={serviceId}
          tasks={tasks}
          currentUserId={authenticatedUser.id}
          userDisplayNames={userDisplayNames}
        />

        <ServiceTimelineSection
          serviceId={serviceId}
          events={events}
          currentUserId={authenticatedUser.id}
          userDisplayNames={userDisplayNames}
        />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#17352b]">
                  Historico financeiro
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Todos os lancamentos financeiros vinculados a este servico.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  Receitas
                </span>
                <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                  Despesas
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {totalLancamentos} lancamentos
                </span>
              </div>
            </div>
          </div>

          {financialEntries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum lancamento vinculado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Este servico ainda nao possui receitas ou despesas cadastradas.
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
                      Categoria
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Descricao
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
                        {entry.categoria ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {entry.descricao ?? "-"}
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
      </div>
    </AppShell>
  );
}
