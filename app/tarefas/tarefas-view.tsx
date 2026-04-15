"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { ActiveFilterChips } from "../components/active-filter-chips";
import { ActionsMenu } from "../components/actions-menu";
import { KanbanBoard, type KanbanColumn } from "../components/kanban-board";
import { PageTable } from "../components/page-table";
import { PageToolbar } from "../components/page-toolbar";
import { ResponsibleInsights } from "../components/responsible-insights";
import { SearchableSelect } from "../components/searchable-select";
import { SummaryCard, SummaryCardsGrid } from "../components/summary-card";
import {
  fieldInputClassName,
  fieldSelectClassName,
  fieldTextareaClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  toolbarSearchInputClassName,
  toolbarSelectClassName,
} from "../components/ui-patterns";
import { ViewModeToggle } from "../components/view-mode-toggle";
import { getStatusClassName, normalizeStatusText } from "../components/status-utils";
import {
  formatSimpleDate,
  getDateInputValue,
  isBeforeTodayDateOnly,
} from "../../lib/date-utils";
import { supabase } from "../../lib/supabase";
import {
  getUserLabel,
  type UserDisplayMap,
  type UserOption,
} from "../../lib/user-profiles";
import { TASK_PRIORITY_OPTIONS } from "./priority-options";
import { TASK_STATUS_OPTIONS } from "./status-options";
import type { ServicoOption, Tarefa } from "./types";

type TarefasViewProps = {
  tasks: Tarefa[];
  services: ServicoOption[];
  currentUserId?: string | null;
  userDisplayNames?: UserDisplayMap;
  userOptions?: UserOption[];
  currentUserName?: string;
  currentUserDetail?: string;
  currentUserInitials?: string;
};

type ModalMode = "create" | "edit";
type ViewMode = "list" | "kanban";
type TaskFilter = "all" | "todo" | "overdue" | "done";

type FormData = {
  titulo: string;
  servico_id: string;
  responsavel: string;
  responsavel_id: string;
  data_limite: string;
  prioridade: string;
  status: string;
  observacao: string;
};

const initialFormData: FormData = {
  titulo: "",
  servico_id: "",
  responsavel: "",
  responsavel_id: "",
  data_limite: "",
  prioridade: TASK_PRIORITY_OPTIONS[0],
  status: TASK_STATUS_OPTIONS[0],
  observacao: "",
};

const noLinkedServiceLabel = "Sem serviço vinculado";

function normalizeText(value: string | null) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function getPriorityClassName(priority: string | null) {
  const normalizedPriority = normalizeText(priority);

  if (normalizedPriority === "alta") {
    return "bg-rose-50 text-rose-700";
  }

  if (normalizedPriority === "media") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedPriority === "baixa") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getTaskStatusLabel(task: Tarefa) {
  if (isOverdueTask(task)) {
    return "Atrasada";
  }

  if (normalizeStatusText(task.status) === "concluido") {
    return "Concluída";
  }

  return "Pendente";
}

function isOverdueTask(task: Tarefa) {
  if (!task.data_limite) {
    return false;
  }

  const normalizedStatus = normalizeStatusText(task.status);

  if (normalizedStatus === "concluida" || normalizedStatus === "concluido") {
    return false;
  }

  return isBeforeTodayDateOnly(task.data_limite);
}

function isTodoTask(task: Tarefa) {
  const normalizedStatus = normalizeStatusText(task.status);

  return normalizedStatus !== "concluida" && normalizedStatus !== "concluido";
}

function isDoneTask(task: Tarefa) {
  const normalizedStatus = normalizeStatusText(task.status);

  return normalizedStatus === "concluida" || normalizedStatus === "concluido";
}

function getServiceClientName(service: ServicoOption) {
  if (Array.isArray(service.cliente)) {
    return service.cliente[0]?.nome ?? "Cliente não encontrado";
  }

  return service.cliente?.nome ?? "Cliente não encontrado";
}

function getServiceOptionLabel(service: ServicoOption) {
  const serviceName = service.nome_servico ?? `Serviço ${service.id}`;
  const clientName = getServiceClientName(service);

  return `${serviceName} — ${clientName}`;
}

function getTaskTone(status: string | null) {
  const normalizedStatus = normalizeStatusText(status);

  if (normalizedStatus === "concluida" || normalizedStatus === "concluido") {
    return "success" as const;
  }

  if (normalizedStatus === "em andamento") {
    return "info" as const;
  }

  return "warning" as const;
}

export function TarefasView({
  tasks,
  services,
  currentUserId = null,
  userDisplayNames = {},
  userOptions = [],
  currentUserName,
  currentUserDetail,
  currentUserInitials,
}: TarefasViewProps) {
  const router = useRouter();
  const [taskList, setTaskList] = useState(tasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  useEffect(() => {
    setTaskList(tasks);
  }, [tasks]);
  const defaultResponsibleId = currentUserId || userOptions[0]?.id || "";
  const userLabelById = new Map(
    userOptions.map((option) => [option.id, option.label])
  );

  const serviceNameById = new Map(
    services.map((service) => [
      String(service.id),
      getServiceOptionLabel(service),
    ])
  );

  function getTaskServiceName(task: Tarefa) {
    if (task.servico_id === null || task.servico_id === undefined) {
      return noLinkedServiceLabel;
    }

    return serviceNameById.get(String(task.servico_id)) ?? "Serviço não encontrado";
  }

  function getTaskResponsibleLabel(task: Tarefa) {
    return getUserLabel(userDisplayNames, task.responsavel_id, task.responsavel);
  }

  const normalizedSearchTerm = normalizeText(searchTerm);
  const overdueTasks = taskList.filter(isOverdueTask);
  const todoTasks = taskList.filter(isTodoTask);
  const doneTasks = taskList.filter(isDoneTask);
  const filteredTasks = taskList.filter((task) => {
    if (taskFilter === "overdue" && !isOverdueTask(task)) {
      return false;
    }

    if (taskFilter === "todo" && !isTodoTask(task)) {
      return false;
    }

    if (taskFilter === "done" && !isDoneTask(task)) {
      return false;
    }

    if (statusFilter && task.status !== statusFilter) {
      return false;
    }

    if (
      responsavelFilter &&
      getTaskResponsibleLabel(task) !== responsavelFilter
    ) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableFields = [
      task.titulo,
      getTaskResponsibleLabel(task),
      getTaskStatusLabel(task),
      task.prioridade,
      getTaskServiceName(task),
    ];

    return searchableFields.some((field) =>
      normalizeText(field).includes(normalizedSearchTerm)
    );
  });

  const summaryCards = [
    {
      title: "Total de tarefas",
      value: String(taskList.length),
      detail: "Atividades cadastradas no módulo",
      filter: "all" as TaskFilter,
    },
    {
      title: "A fazer",
      value: String(todoTasks.length),
      detail: 'Tarefas com status diferente de "Concluído"',
      filter: "todo" as TaskFilter,
    },
    {
      title: "Tarefas atrasadas",
      value: String(overdueTasks.length),
      detail: 'Prazo vencido e status diferente de "Concluído"',
      filter: "overdue" as TaskFilter,
    },
    {
      title: "Concluídas",
      value: String(doneTasks.length),
      detail: "Tarefas finalizadas dentro do fluxo atual",
      filter: "done" as TaskFilter,
    },
  ];
  const responsibleTaskInsights = Array.from(
    filteredTasks.reduce(
      (map, task) => {
        const responsibleLabel = getTaskResponsibleLabel(task);
        const currentItem = map.get(responsibleLabel) ?? {
          label: responsibleLabel,
          pending: 0,
          overdue: 0,
        };

        if (!isDoneTask(task)) {
          currentItem.pending += 1;
        }

        if (isOverdueTask(task)) {
          currentItem.overdue += 1;
        }

        map.set(responsibleLabel, currentItem);
        return map;
      },
      new Map<
        string,
        { label: string; pending: number; overdue: number }
      >()
    ).values()
  )
    .sort((leftItem, rightItem) => {
      if (rightItem.overdue !== leftItem.overdue) {
        return rightItem.overdue - leftItem.overdue;
      }

      if (rightItem.pending !== leftItem.pending) {
        return rightItem.pending - leftItem.pending;
      }

      return leftItem.label.localeCompare(rightItem.label, "pt-BR");
    })
    .slice(0, 4)
    .map((item) => ({
      label: item.label,
      metric: String(item.pending),
      detail:
        item.overdue > 0
          ? `${item.overdue} tarefa(s) vencidas no resultado atual.`
          : "Pendências distribuídas sem atraso no recorte filtrado.",
      tone: item.overdue > 0 ? ("danger" as const) : ("info" as const),
    }));
  const activeFilterChips = [
    searchTerm
      ? {
          key: "search",
          label: `Busca: ${searchTerm}`,
          onRemove: () => setSearchTerm(""),
        }
      : null,
    taskFilter !== "all"
      ? {
          key: "task-filter",
          label: `Atalho: ${
            summaryCards.find((card) => card.filter === taskFilter)?.title ??
            taskFilter
          }`,
          onRemove: () => setTaskFilter("all"),
        }
      : null,
    statusFilter
      ? {
          key: "status",
          label: `Status: ${statusFilter}`,
          onRemove: () => setStatusFilter(""),
        }
      : null,
    responsavelFilter
      ? {
          key: "responsavel",
          label: `Responsável: ${responsavelFilter}`,
          onRemove: () => setResponsavelFilter(""),
        }
      : null,
  ].filter((chip) => chip !== null);
  const responsibleOptions = Array.from(
    new Set(
      taskList
        .map((task) => getTaskResponsibleLabel(task))
        .filter((value) => value && value !== "-")
    )
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));
  const kanbanColumns: KanbanColumn<Tarefa>[] = TASK_STATUS_OPTIONS.map(
    (statusOption) => ({
      id: statusOption,
      title: statusOption,
      tone: getTaskTone(statusOption),
      items: filteredTasks.filter((task) => task.status === statusOption),
      emptyMessage: "Nenhuma tarefa nesta etapa com os filtros atuais.",
    })
  );

  function openModal() {
    setModalMode("create");
    setEditingTaskId(null);
    setFormData({
      ...initialFormData,
      responsavel_id: defaultResponsibleId,
      responsavel: userLabelById.get(defaultResponsibleId) ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(task: Tarefa) {
    setModalMode("edit");
    setEditingTaskId(task.id);
    setFormData({
      titulo: task.titulo ?? "",
      servico_id:
        task.servico_id === null || task.servico_id === undefined
          ? ""
          : String(task.servico_id),
      responsavel: task.responsavel ?? "",
      responsavel_id: task.responsavel_id ?? defaultResponsibleId,
      data_limite: getDateInputValue(task.data_limite),
      prioridade: task.prioridade ?? TASK_PRIORITY_OPTIONS[0],
      status: task.status ?? TASK_STATUS_OPTIONS[0],
      observacao: task.observacao ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalMode("create");
    setEditingTaskId(null);
    setErrorMessage("");
    setFormData(initialFormData);
  }

  function updateField(field: keyof FormData, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const titulo = formData.titulo.trim();
    const servicoId = formData.servico_id.trim();
    const responsavelId =
      formData.responsavel_id.trim() || defaultResponsibleId || null;
    const responsavel =
      (responsavelId ? userLabelById.get(responsavelId) : null) ??
      (formData.responsavel.trim() || null);
    const dataLimite = formData.data_limite.trim();
    const prioridade = formData.prioridade.trim();
    const status = formData.status.trim();
    const observacao = formData.observacao.trim();

    if (!titulo) {
      setErrorMessage("Informe o título da tarefa.");
      return;
    }

    if (!prioridade) {
      setErrorMessage("Selecione a prioridade da tarefa.");
      return;
    }

    if (!status) {
      setErrorMessage("Selecione o status da tarefa.");
      return;
    }

    const isEditing = modalMode === "edit";
    const taskId = editingTaskId;
    const parsedServicoId = servicoId ? Number(servicoId) : null;

    if (isEditing && taskId === null) {
      setErrorMessage("Não foi possível identificar a tarefa para edição.");
      return;
    }

    if (servicoId && Number.isNaN(parsedServicoId)) {
      setErrorMessage("Serviço inválido.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const taskPayload = {
      titulo,
      servico_id: parsedServicoId,
      responsavel,
      responsavel_id: responsavelId,
      data_limite: dataLimite || null,
      prioridade,
      status,
      observacao: observacao || null,
      ...(isEditing
        ? {
            updated_at: new Date().toISOString(),
            atualizado_por: currentUserId || null,
          }
        : {
            criado_por: currentUserId || null,
            atualizado_por: currentUserId || null,
            responsavel_id: responsavelId,
          }),
    };

    const response = isEditing
      ? await supabase.from("tarefas").update(taskPayload).eq("id", taskId)
      : await supabase.from("tarefas").insert(taskPayload);

    setIsSaving(false);

    if (response.error) {
      setErrorMessage(
        isEditing
          ? "Não foi possível atualizar a tarefa agora. Tente novamente."
          : "Não foi possível salvar a tarefa agora. Tente novamente."
      );
      return;
    }

    closeModal();
    setSuccessMessage(
      isEditing
        ? "Tarefa atualizada com sucesso."
        : "Tarefa salva com sucesso."
    );
    router.refresh();
  }

  async function handleDelete(task: Tarefa) {
    const shouldDelete = window.confirm("Tem certeza que deseja excluir?");

    if (!shouldDelete) {
      return;
    }

    setDeletingTaskId(task.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.from("tarefas").delete().eq("id", task.id);

    setDeletingTaskId(null);

    if (error) {
      setErrorMessage("Não foi possível excluir a tarefa agora. Tente novamente.");
      return;
    }

    setSuccessMessage("Tarefa excluída com sucesso.");
    router.refresh();
  }

  async function updateTaskStatus(task: Tarefa, nextStatus: string) {
    const trimmedStatus = nextStatus.trim();

    if (!trimmedStatus || trimmedStatus === task.status) {
      return;
    }

    setUpdatingTaskId(task.id);
    setErrorMessage("");
    setSuccessMessage("");
    setTaskList((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? { ...currentTask, status: trimmedStatus }
          : currentTask
      )
    );

    const { error } = await supabase
      .from("tarefas")
      .update({
        status: trimmedStatus,
        updated_at: new Date().toISOString(),
        atualizado_por: currentUserId || null,
      })
      .eq("id", task.id);

    setUpdatingTaskId(null);

    if (error) {
      setTaskList((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id
            ? { ...currentTask, status: task.status }
            : currentTask
        )
      );
      setErrorMessage(
        "Não foi possível atualizar o status da tarefa agora. Tente novamente."
      );
      return;
    }

    setSuccessMessage("Status da tarefa atualizado com sucesso.");
    router.refresh();
  }

  function handleKanbanMove(taskId: string, nextColumnId: string) {
    const task = taskList.find((currentTask) => String(currentTask.id) === taskId);

    if (!task) {
      return;
    }

    updateTaskStatus(task, nextColumnId);
  }

  return (
    <>
      <AppShell
        title="Tarefas"
        description="Atividades da empresa, com ou sem serviço vinculado, sincronizadas com o Supabase."
        currentPath="/tarefas"
        currentUserName={currentUserName}
        currentUserDetail={currentUserDetail}
        currentUserInitials={currentUserInitials}
        action={
          <button
            type="button"
            onClick={openModal}
            className={primaryButtonClassName}
          >
            Nova tarefa
          </button>
        }
      >
        {successMessage ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <PageToolbar>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Busca
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por título, serviço, responsável, prioridade ou status"
                className={toolbarSearchInputClassName}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={toolbarSelectClassName}
                >
                  <option value="">Todos os status</option>
                  {TASK_STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
                Responsável
                <select
                  value={responsavelFilter}
                  onChange={(event) => setResponsavelFilter(event.target.value)}
                  className={toolbarSelectClassName}
                >
                  <option value="">Todos os responsáveis</option>
                  {responsibleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          <ActiveFilterChips
            chips={activeFilterChips}
            totalLabel={`${filteredTasks.length} resultado${
              filteredTasks.length === 1 ? "" : "s"
            }`}
            onClearAll={() => {
              setSearchTerm("");
              setTaskFilter("all");
              setStatusFilter("");
              setResponsavelFilter("");
            }}
          />
        </PageToolbar>

        <section className="mb-6">
          <SummaryCardsGrid className="xl:grid-cols-4 2xl:grid-cols-4">
            {summaryCards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => setTaskFilter(card.filter)}
                aria-pressed={taskFilter === card.filter}
                className={`h-full w-full text-left ${
                  taskFilter === card.filter
                    ? "rounded-[28px] ring-2 ring-[#1e6b41]/18"
                    : ""
                }`}
              >
                <SummaryCard
                  title={card.title}
                  value={card.value}
                  detail={card.detail}
                  tone={
                    card.filter === "overdue"
                      ? "danger"
                      : card.filter === "todo"
                        ? "warning"
                        : card.filter === "done"
                          ? "success"
                        : "neutral"
                  }
                  className={
                    taskFilter === card.filter
                      ? "border-[#1e6b41]/20 bg-emerald-50/40"
                      : ""
                  }
                />
              </button>
            ))}
          </SummaryCardsGrid>
        </section>

        <section className="mb-6">
          <ResponsibleInsights
            title="Carga por responsável"
            description="Leitura rápida de quem está com mais tarefas pendentes dentro do resultado atual."
            emptyMessage="A carga por responsável aparecerá aqui quando houver tarefas no resultado atual."
            items={responsibleTaskInsights}
          />
        </section>

        <PageTable>
          {taskList.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhuma tarefa cadastrada
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver registros na tabela de tarefas, eles aparecerão aqui.
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhuma tarefa encontrada
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Tente buscar por outro título, serviço, responsável ou status.
              </p>
            </div>
          ) : viewMode === "kanban" ? (
            <div className="p-4 sm:p-5">
              <KanbanBoard
                columns={kanbanColumns}
                getItemKey={(task) => String(task.id)}
                onMoveItem={handleKanbanMove}
                renderCard={(task) => (
                  <article
                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.26)] ${
                      isOverdueTask(task) ? "ring-1 ring-rose-200" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#17352b]">
                          {task.titulo ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getTaskServiceName(task)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClassName(
                          task.prioridade
                        )}`}
                      >
                        {task.prioridade ?? "Sem prioridade"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span>Responsável</span>
                        <span className="font-medium text-slate-700">
                          {getTaskResponsibleLabel(task)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Data</span>
                        <span
                          className={
                            isOverdueTask(task)
                              ? "font-medium text-rose-700"
                              : "font-medium text-slate-700"
                          }
                        >
                          {formatSimpleDate(task.data_limite)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <select
                        value={task.status ?? ""}
                        disabled={updatingTaskId === task.id}
                        onChange={(event) =>
                          updateTaskStatus(task, event.target.value)
                        }
                        className={`h-10 w-full rounded-xl px-3 py-2 text-sm font-medium outline-none transition focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70 ${getStatusClassName(
                          getTaskStatusLabel(task)
                        )}`}
                      >
                        {TASK_STATUS_OPTIONS.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(task)}
                        className="text-sm font-semibold text-[#17352b] transition hover:text-[#204638]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(task)}
                        disabled={deletingTaskId === task.id}
                        className="text-sm font-medium text-slate-500 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingTaskId === task.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </article>
                )}
              />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-[860px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Título
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Serviço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Responsável
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Data
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Prioridade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50/80 ${
                        isOverdueTask(task) ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{task.titulo ?? "-"}</span>
                          {isOverdueTask(task) ? (
                            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                              Atrasada
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {getTaskServiceName(task)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {getTaskResponsibleLabel(task)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm ${
                          isOverdueTask(task)
                            ? "font-medium text-rose-700"
                            : "text-slate-500"
                        }`}
                      >
                        {formatSimpleDate(task.data_limite)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClassName(
                            task.prioridade
                          )}`}
                        >
                          {task.prioridade ?? "Sem prioridade"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-600">
                            <input
                              type="checkbox"
                              checked={
                                normalizeStatusText(task.status) === "concluido"
                              }
                              disabled={updatingTaskId === task.id}
                              onChange={(event) =>
                                updateTaskStatus(
                                  task,
                                  event.target.checked
                                    ? "Concluído"
                                    : "Pendente"
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300 align-middle text-emerald-600 focus:ring-emerald-200"
                              aria-label={`Marcar tarefa ${task.titulo ?? task.id} como concluída`}
                            />
                            Concluir
                          </label>

                          <span
                            className={`inline-flex min-h-10 items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                              getTaskStatusLabel(task)
                            )}`}
                          >
                            {getTaskStatusLabel(task)}
                          </span>
                        </div>
                        {updatingTaskId === task.id ? (
                          <p className="mt-1 text-xs text-slate-400">
                            Salvando alteração...
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <ActionsMenu
                          items={[
                            {
                              label: "Editar",
                              onClick: () => openEditModal(task),
                            },
                            {
                              label:
                                deletingTaskId === task.id
                                  ? "Excluindo..."
                                  : "Excluir",
                              onClick: () => handleDelete(task),
                              disabled: deletingTaskId === task.id,
                              tone: "danger",
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageTable>
      </AppShell>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                {modalMode === "edit" ? "Editar tarefa" : "Nova tarefa"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modalMode === "edit"
                  ? "Atualize os dados da tarefa selecionada."
                  : "Preencha os campos abaixo para cadastrar uma nova tarefa."}
              </p>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleSubmit}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Título
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(event) => updateField("titulo", event.target.value)}
                      placeholder="Digite o título da tarefa"
                      className={fieldInputClassName}
                    />
                  </label>

                  <SearchableSelect
                    label="Serviço"
                    value={formData.servico_id}
                    onChange={(value) => updateField("servico_id", value)}
                    options={services.map((service) => ({
                      value: String(service.id),
                      label: getServiceOptionLabel(service),
                      searchText: `${service.nome_servico ?? ""} ${getServiceClientName(service)}`,
                    }))}
                    emptyOptionLabel={noLinkedServiceLabel}
                    searchPlaceholder="Digite para buscar um serviço"
                    helperText="Opcional. Use apenas quando a tarefa fizer parte de um serviço."
                  />

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Responsável
                    <select
                      value={formData.responsavel_id}
                      onChange={(event) => {
                        const nextResponsibleId = event.target.value;
                        updateField("responsavel_id", nextResponsibleId);
                        updateField(
                          "responsavel",
                          userLabelById.get(nextResponsibleId) ?? ""
                        );
                      }}
                      className={fieldSelectClassName}
                    >
                      <option value="">Selecione um responsável</option>
                      {userOptions.map((userOption) => (
                        <option key={userOption.id} value={userOption.id}>
                          {userOption.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Data
                    <input
                      type="date"
                      value={formData.data_limite}
                      onChange={(event) =>
                        updateField("data_limite", event.target.value)
                      }
                      className={fieldInputClassName}
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Prioridade
                    <select
                      value={formData.prioridade}
                      onChange={(event) =>
                        updateField("prioridade", event.target.value)
                      }
                      className={fieldSelectClassName}
                    >
                      {TASK_PRIORITY_OPTIONS.map((priorityOption) => (
                        <option key={priorityOption} value={priorityOption}>
                          {priorityOption}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className={fieldSelectClassName}
                    >
                      {TASK_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Observação
                    <textarea
                      rows={4}
                      value={formData.observacao}
                      onChange={(event) =>
                        updateField("observacao", event.target.value)
                      }
                      placeholder="Detalhes importantes da tarefa"
                      className={fieldTextareaClassName}
                    />
                  </label>
                </div>

                {errorMessage ? (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-5">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className={secondaryButtonClassName}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={primaryButtonClassName}
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}





