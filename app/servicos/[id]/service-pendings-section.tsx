"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionsMenu } from "../../components/actions-menu";
import {
  formatSimpleDate,
  getDateInputValue,
  isBeforeTodayDateOnly,
} from "../../../lib/date-utils";
import { supabase } from "../../../lib/supabase";
import {
  getPendingPriorityLabel,
  getPendingStaleDays,
  isPendingStale,
  normalizeOperationalText,
} from "../operational-utils";
import { getPendingTemplateByServiceType } from "../service-templates";
import type { ServicoPendencia } from "../types";
import { getUserLabel, type UserDisplayMap } from "../../../lib/user-profiles";

type ServicePendingsSectionProps = {
  serviceId: number;
  serviceType: string | null;
  pendings: ServicoPendencia[];
  currentUserId?: string | null;
  userDisplayNames?: UserDisplayMap;
};

type ModalMode = "create" | "edit";

type FormData = {
  titulo: string;
  origem: string;
  prioridade: string;
  prazo_resposta: string;
  status: string;
  observacao: string;
};

const pendingStatusOptions = [
  "Aberta",
  "Aguardando retorno",
  "Resolvida",
] as const;

const pendingPriorityOptions = ["baixa", "media", "alta"] as const;

const initialFormData: FormData = {
  titulo: "",
  origem: "",
  prioridade: pendingPriorityOptions[1],
  prazo_resposta: "",
  status: pendingStatusOptions[0],
  observacao: "",
};

function normalizeText(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function getNormalizedPriority(value: string | null | undefined) {
  const normalizedValue = normalizeOperationalText(value);

  if (
    pendingPriorityOptions.includes(
      normalizedValue as (typeof pendingPriorityOptions)[number]
    )
  ) {
    return normalizedValue;
  }

  return "media";
}

function getPendingStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "resolvida") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "aguardando retorno") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getPendingPriorityClassName(priority: string | null) {
  const normalizedPriority = normalizeText(priority);

  if (normalizedPriority === "alta") {
    return "bg-rose-50 text-rose-700";
  }

  if (normalizedPriority === "media") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function ServicePendingsSection({
  serviceId,
  serviceType,
  pendings,
  currentUserId = null,
  userDisplayNames = {},
}: ServicePendingsSectionProps) {
  const router = useRouter();
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingPendingId, setEditingPendingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingPendingId, setDeletingPendingId] = useState<number | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const pendingTemplates = getPendingTemplateByServiceType(serviceType ?? "");

  function openCreateModal() {
    setModalMode("create");
    setEditingPendingId(null);
    setFormData(initialFormData);
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(pending: ServicoPendencia) {
    setModalMode("edit");
    setEditingPendingId(pending.id);
    setFormData({
      titulo: pending.titulo ?? "",
      origem: pending.origem ?? "",
      prioridade: getNormalizedPriority(pending.prioridade),
      prazo_resposta: getDateInputValue(pending.prazo_resposta),
      status: pending.status ?? pendingStatusOptions[0],
      observacao: pending.observacao ?? "",
    });
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setModalMode("create");
    setEditingPendingId(null);
    setFormData(initialFormData);
    setErrorMessage("");
    setIsModalOpen(false);
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
    const origem = formData.origem.trim();
    const prioridade = getNormalizedPriority(formData.prioridade);
    const prazoResposta = formData.prazo_resposta.trim();
    const status = formData.status.trim();
    const observacao = formData.observacao.trim();

    if (!titulo) {
      setErrorMessage("Informe a pendência.");
      return;
    }

    if (!status) {
      setErrorMessage("Selecione o status da pendência.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const isEditing = modalMode === "edit";

    const payload = {
      servico_id: serviceId,
      titulo,
      origem: origem || null,
      prioridade,
      prazo_resposta: prazoResposta || null,
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
          }),
    };

    const [{ error: pendingError }, { error: eventError }] = await Promise.all([
      isEditing && editingPendingId !== null
        ? supabase.from("servico_pendencias").update(payload).eq("id", editingPendingId)
        : supabase.from("servico_pendencias").insert(payload),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "pendencia",
        titulo: isEditing
          ? "Pendência atualizada"
          : "Nova pendência registrada",
        descricao: `${titulo} - ${status}${prazoResposta ? ` - prazo ${prazoResposta}` : ""}`,
        criado_por: currentUserId || null,
      }),
    ]);

    setIsSaving(false);

    if (pendingError || eventError) {
      setErrorMessage(
        isEditing
          ? "Não foi possível atualizar a pendência agora."
          : "Não foi possível registrar a pendência agora."
      );
      return;
    }

    closeModal();
    router.refresh();
  }

  async function updatePendingStatus(
    pending: ServicoPendencia,
    nextStatus: string
  ) {
    if (!nextStatus || nextStatus === pending.status) {
      return;
    }

    setErrorMessage("");

    const [{ error: pendingError }, { error: eventError }] = await Promise.all([
      supabase
        .from("servico_pendencias")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
          atualizado_por: currentUserId || null,
        })
        .eq("id", pending.id),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "pendencia",
        titulo: "Pendência atualizada",
        descricao: `${pending.titulo ?? "Pendência"} alterada para ${nextStatus}.`,
        criado_por: currentUserId || null,
      }),
    ]);

    if (pendingError || eventError) {
      setErrorMessage("Não foi possível atualizar a pendência agora.");
      return;
    }

    router.refresh();
  }

  async function handleDelete(pending: ServicoPendencia) {
    const shouldDelete = window.confirm("Tem certeza que deseja excluir?");

    if (!shouldDelete) {
      return;
    }

    setDeletingPendingId(pending.id);
    setErrorMessage("");

    const [{ error: deleteError }, { error: eventError }] = await Promise.all([
      supabase.from("servico_pendencias").delete().eq("id", pending.id),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "pendencia",
        titulo: "Pendência removida",
        descricao: pending.titulo ?? "Pendência sem título",
        criado_por: currentUserId || null,
      }),
    ]);

    setDeletingPendingId(null);

    if (deleteError || eventError) {
      setErrorMessage("Não foi possível excluir a pendência agora.");
      return;
    }

    router.refresh();
  }

  async function handleApplyTemplatePendings() {
    if (!serviceType || pendingTemplates.length === 0) {
      setErrorMessage("Não há sugestões padrão para este tipo de serviço.");
      return;
    }

    setIsApplyingTemplate(true);
    setErrorMessage("");

    const existingTitles = new Set(
      pendings.map((pending) => normalizeText(pending.titulo)).filter(Boolean)
    );
    const pendingsToInsert = pendingTemplates.filter(
      (pendingTemplate) =>
        !existingTitles.has(normalizeText(pendingTemplate.titulo))
    );

    if (pendingsToInsert.length === 0) {
      setIsApplyingTemplate(false);
      setErrorMessage("As pendências sugeridas deste tipo já foram aplicadas.");
      return;
    }

    const [{ error: pendingError }, { error: eventError }] = await Promise.all([
      supabase.from("servico_pendencias").insert(
        pendingsToInsert.map((pendingTemplate) => ({
          servico_id: serviceId,
          titulo: pendingTemplate.titulo,
          origem: pendingTemplate.origem,
          prioridade: pendingTemplate.prioridade ?? "media",
          status: "Aberta",
          criado_por: currentUserId || null,
          atualizado_por: currentUserId || null,
        }))
      ),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "pendencia",
        titulo: "Pendências sugeridas aplicadas",
        descricao: `${pendingsToInsert.length} pendência(s) padrão foram adicionadas ao serviço.`,
        criado_por: currentUserId || null,
      }),
    ]);

    setIsApplyingTemplate(false);

    if (pendingError || eventError) {
      setErrorMessage("Não foi possível aplicar as pendências sugeridas agora.");
      return;
    }

    router.refresh();
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#17352b]">
                Pendências do serviço
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Itens aguardando retorno do cliente, cartório ou órgãos.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#204638]"
              >
                Nova pendência
              </button>

              {pendingTemplates.length > 0 ? (
                <button
                  type="button"
                  onClick={handleApplyTemplatePendings}
                  disabled={isApplyingTemplate}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isApplyingTemplate ? "Aplicando..." : "Aplicar sugestões"}
                </button>
              ) : null}
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        {pendings.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">
            Nenhuma pendência cadastrada para este serviço.
          </div>
        ) : (
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {pendings.map((pending) => (
              <article
                key={pending.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#17352b]">
                      {pending.titulo ?? "-"}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {pending.origem ?? "Origem não informada"}
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPendingStatusClassName(
                        pending.status
                      )}`}
                    >
                      {pending.status ?? "-"}
                    </span>
                    <ActionsMenu
                      items={[
                        {
                          label: "Editar",
                          onClick: () => openEditModal(pending),
                        },
                        {
                          label:
                            deletingPendingId === pending.id
                              ? "Excluindo..."
                              : "Excluir",
                          onClick: () => handleDelete(pending),
                          disabled: deletingPendingId === pending.id,
                          tone: "danger",
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPendingPriorityClassName(
                      pending.prioridade
                    )}`}
                  >
                    Prioridade {getPendingPriorityLabel(pending.prioridade)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      pending.prazo_resposta && isBeforeTodayDateOnly(pending.prazo_resposta)
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {pending.prazo_resposta
                      ? `Prazo ${formatSimpleDate(pending.prazo_resposta)}`
                      : "Sem prazo"}
                  </span>
                  {isPendingStale(pending) ? (
                    <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      Parada há {getPendingStaleDays(pending)} dias
                    </span>
                  ) : null}
                </div>

                  {pending.observacao ? (
                  <p className="mt-3 text-sm text-slate-500">{pending.observacao}</p>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Sem observações adicionais.
                  </p>
                )}

                <div className="mt-3 grid gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between gap-3">
                    <span>Responsável</span>
                    <span className="font-medium text-slate-700">
                      {getUserLabel(
                        userDisplayNames,
                        pending.responsavel_id,
                        null
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Última atualização</span>
                    <span className="font-medium text-slate-700">
                      {getUserLabel(
                        userDisplayNames,
                        pending.atualizado_por ?? pending.criado_por,
                        null
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <select
                    value={pending.status ?? ""}
                    onChange={(event) =>
                      updatePendingStatus(pending, event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  >
                    {pendingStatusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                {modalMode === "edit" ? "Editar pendência" : "Nova pendência"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modalMode === "edit"
                  ? "Atualize os dados da pendência selecionada."
                  : "Registre um item pendente para acompanhar o serviço."}
              </p>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Pendência
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(event) => updateField("titulo", event.target.value)}
                      placeholder="Descreva a pendência"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Origem
                    <input
                      type="text"
                      value={formData.origem}
                      onChange={(event) => updateField("origem", event.target.value)}
                      placeholder="Cliente, cartório, órgão, confrontante..."
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
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
                      {pendingPriorityOptions.map((priorityOption) => (
                        <option key={priorityOption} value={priorityOption}>
                          {getPendingPriorityLabel(priorityOption)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Prazo de resposta
                    <input
                      type="date"
                      value={formData.prazo_resposta}
                      onChange={(event) =>
                        updateField("prazo_resposta", event.target.value)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    >
                      {pendingStatusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Observações
                    <textarea
                      rows={4}
                      value={formData.observacao}
                      onChange={(event) =>
                        updateField("observacao", event.target.value)
                      }
                      placeholder="Detalhes importantes para acompanhar esta pendência"
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
                    className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#204638] disabled:cursor-not-allowed disabled:opacity-70"
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
