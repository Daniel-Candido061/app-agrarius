"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatSimpleDate, isBeforeTodayDateOnly } from "../../../lib/date-utils";
import { supabase } from "../../../lib/supabase";
import { TASK_PRIORITY_OPTIONS } from "../../tarefas/priority-options";
import { TASK_STATUS_OPTIONS } from "../../tarefas/status-options";
import type { Tarefa } from "../../tarefas/types";

type ServiceTasksSectionProps = {
  serviceId: number;
  tasks: Tarefa[];
};

type FormData = {
  titulo: string;
  responsavel: string;
  data_limite: string;
  prioridade: string;
  status: string;
  observacao: string;
};

const initialFormData: FormData = {
  titulo: "",
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

function getTaskStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "pendente") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "em andamento") {
    return "bg-sky-50 text-sky-700";
  }

  if (normalizedStatus === "concluida" || normalizedStatus === "concluido") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getTaskPriorityClassName(priority: string | null) {
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

  const normalizedStatus = normalizeText(task.status);

  if (normalizedStatus === "concluida" || normalizedStatus === "concluido") {
    return false;
  }

  return isBeforeTodayDateOnly(task.data_limite);
}

export function ServiceTasksSection({
  serviceId,
  tasks,
}: ServiceTasksSectionProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function openModal() {
    setFormData(initialFormData);
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setErrorMessage("");
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
    const responsavel = formData.responsavel.trim();
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

    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase.from("tarefas").insert({
      titulo,
      servico_id: serviceId,
      responsavel: responsavel || null,
      data_limite: dataLimite || null,
      prioridade,
      status,
      observacao: observacao || null,
    });

    setIsSaving(false);

    if (error) {
      setErrorMessage("Não foi possível salvar a tarefa agora. Tente novamente.");
      return;
    }

    closeModal();
    router.refresh();
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#17352b]">
                Tarefas do serviço
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Atividades vinculadas a este serviço, ordenadas por data limite.
              </p>
            </div>

            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
            >
              Nova tarefa
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-[#17352b]">
              Nenhuma tarefa cadastrada para este serviço
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Quando houver tarefas vinculadas, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Título
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Responsável
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Prioridade
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Data limite
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
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
                      {task.responsavel ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTaskPriorityClassName(
                          task.prioridade
                        )}`}
                      >
                        {task.prioridade ?? "Sem prioridade"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTaskStatusClassName(
                          task.status
                        )}`}
                      >
                        {task.status ?? "Sem status"}
                      </span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                Nova tarefa
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Preencha os campos abaixo para cadastrar uma tarefa para este
                serviço.
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
                      placeholder="Digite o título da tarefa"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
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
