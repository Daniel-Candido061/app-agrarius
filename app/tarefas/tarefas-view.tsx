"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import {
  formatDateOnly,
  getDateInputValue,
  isBeforeTodayDateOnly,
} from "../../lib/date-utils";
import { supabase } from "../../lib/supabase";
import { TASK_PRIORITY_OPTIONS } from "./priority-options";
import { TASK_STATUS_OPTIONS } from "./status-options";
import type { ServicoOption, Tarefa } from "./types";

type TarefasViewProps = {
  tasks: Tarefa[];
  services: ServicoOption[];
};

type ModalMode = "create" | "edit";

type FormData = {
  titulo: string;
  servico_id: string;
  responsavel: string;
  data_limite: string;
  prioridade: string;
  status: string;
  observacao: string;
};

const initialFormData: FormData = {
  titulo: "",
  servico_id: "",
  responsavel: "",
  data_limite: "",
  prioridade: TASK_PRIORITY_OPTIONS[0],
  status: TASK_STATUS_OPTIONS[0],
  observacao: "",
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

function getStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "pendente") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "em andamento") {
    return "bg-sky-50 text-sky-700";
  }

  if (normalizedStatus === "concluida") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
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

function isOverdueTask(task: Tarefa) {
  if (!task.data_limite) {
    return false;
  }

  if (normalizeText(task.status) === "concluida") {
    return false;
  }

  return isBeforeTodayDateOnly(task.data_limite);
}

export function TarefasView({ tasks, services }: TarefasViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const serviceNameById = new Map(
    services.map((service) => [
      String(service.id),
      service.nome_servico ?? `Servico ${service.id}`,
    ])
  );
  const normalizedSearchTerm = normalizeText(searchTerm);
  const filteredTasks = tasks.filter((task) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableFields = [
      task.titulo,
      task.responsavel,
      task.status,
      task.prioridade,
      serviceNameById.get(String(task.servico_id)) ?? "Servico nao encontrado",
    ];

    return searchableFields.some((field) =>
      normalizeText(field).includes(normalizedSearchTerm)
    );
  });

  function openModal() {
    setModalMode("create");
    setEditingTaskId(null);
    setFormData(initialFormData);
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
    const responsavel = formData.responsavel.trim();
    const dataLimite = formData.data_limite.trim();
    const prioridade = formData.prioridade.trim();
    const status = formData.status.trim();
    const observacao = formData.observacao.trim();

    if (!titulo) {
      setErrorMessage("Informe o titulo da tarefa.");
      return;
    }

    if (!servicoId) {
      setErrorMessage("Selecione o servico vinculado.");
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
    const parsedServicoId = Number(servicoId);

    if (isEditing && taskId === null) {
      setErrorMessage("Nao foi possivel identificar a tarefa para edicao.");
      return;
    }

    if (Number.isNaN(parsedServicoId)) {
      setErrorMessage("Servico invalido.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const taskPayload = {
      titulo,
      servico_id: parsedServicoId,
      responsavel: responsavel || null,
      data_limite: dataLimite || null,
      prioridade,
      status,
      observacao: observacao || null,
    };

    const response = isEditing
      ? await supabase.from("tarefas").update(taskPayload).eq("id", taskId)
      : await supabase.from("tarefas").insert(taskPayload);

    setIsSaving(false);

    if (response.error) {
      setErrorMessage(
        isEditing
          ? "Nao foi possivel atualizar a tarefa agora. Tente novamente."
          : "Nao foi possivel salvar a tarefa agora. Tente novamente."
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
      setErrorMessage("Nao foi possivel excluir a tarefa agora. Tente novamente.");
      return;
    }

    setSuccessMessage("Tarefa excluida com sucesso.");
    router.refresh();
  }

  return (
    <>
      <AppShell
        title="Tarefas"
        description="Atividades vinculadas aos servicos, sincronizadas com o Supabase."
        currentPath="/tarefas"
        action={
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
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

        <div className="mb-5">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por titulo, servico, responsavel, prioridade ou status"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)] outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          {tasks.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhuma tarefa cadastrada
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver registros na tabela tarefas, eles aparecerao aqui.
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhuma tarefa encontrada
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Tente buscar por outro titulo, servico, responsavel ou status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Titulo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Servico
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Responsavel
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Data limite
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Prioridade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Acoes
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
                            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                              Atrasada
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {serviceNameById.get(String(task.servico_id)) ??
                          "Servico nao encontrado"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {task.responsavel ?? "-"}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm ${
                          isOverdueTask(task)
                            ? "font-medium text-rose-700"
                            : "text-slate-500"
                        }`}
                      >
                        {formatDateOnly(task.data_limite)}
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
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                            task.status
                          )}`}
                        >
                          {task.status ?? "Sem status"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(task)}
                            disabled={deletingTaskId === task.id}
                            className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingTaskId === task.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
                    Titulo
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(event) => updateField("titulo", event.target.value)}
                      placeholder="Digite o titulo da tarefa"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Servico
                    <select
                      value={formData.servico_id}
                      onChange={(event) =>
                        updateField("servico_id", event.target.value)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    >
                      <option value="">Selecione um servico</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.nome_servico ?? `Servico ${service.id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Responsavel
                    <input
                      type="text"
                      value={formData.responsavel}
                      onChange={(event) =>
                        updateField("responsavel", event.target.value)
                      }
                      placeholder="Nome do responsavel"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Data limite
                    <input
                      type="date"
                      value={formData.data_limite}
                      onChange={(event) =>
                        updateField("data_limite", event.target.value)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Prioridade
                    <select
                      value={formData.prioridade}
                      onChange={(event) =>
                        updateField("prioridade", event.target.value)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
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
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    >
                      {TASK_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Observacao
                    <textarea
                      rows={4}
                      value={formData.observacao}
                      onChange={(event) =>
                        updateField("observacao", event.target.value)
                      }
                      placeholder="Detalhes importantes da tarefa"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
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
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
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
