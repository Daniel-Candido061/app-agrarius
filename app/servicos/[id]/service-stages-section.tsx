"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionsMenu } from "../../components/actions-menu";
import { supabase } from "../../../lib/supabase";
import type { ServicoEtapa } from "../types";

type ServiceStagesSectionProps = {
  serviceId: number;
  stages: ServicoEtapa[];
  currentUserId?: string | null;
};

type ModalMode = "create" | "edit";

type FormData = {
  titulo: string;
  opcional: boolean;
};

const stageStatusOptions = ["Pendente", "Em andamento", "Concluida"] as const;

const initialFormData: FormData = {
  titulo: "",
  opcional: false,
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

function getStageStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "concluida" || normalizedStatus === "concluido") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "em andamento") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-amber-50 text-amber-700";
}

export function ServiceStagesSection({
  serviceId,
  stages,
  currentUserId = null,
}: ServiceStagesSectionProps) {
  const router = useRouter();
  const orderedStages = [...stages].sort((leftStage, rightStage) => {
    const leftOrder = leftStage.ordem ?? Number.POSITIVE_INFINITY;
    const rightOrder = rightStage.ordem ?? Number.POSITIVE_INFINITY;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const leftCreatedAt = leftStage.created_at
      ? new Date(leftStage.created_at).getTime()
      : Number.POSITIVE_INFINITY;
    const rightCreatedAt = rightStage.created_at
      ? new Date(rightStage.created_at).getTime()
      : Number.POSITIVE_INFINITY;

    return leftCreatedAt - rightCreatedAt;
  });
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingStageId, setUpdatingStageId] = useState<number | null>(null);
  const [reorderingStageId, setReorderingStageId] = useState<number | null>(null);

  function openCreateModal() {
    setModalMode("create");
    setEditingStageId(null);
    setFormData(initialFormData);
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(stage: ServicoEtapa) {
    setModalMode("edit");
    setEditingStageId(stage.id);
    setFormData({
      titulo: stage.titulo ?? "",
      opcional: Boolean(stage.opcional),
    });
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setModalMode("create");
    setEditingStageId(null);
    setFormData(initialFormData);
    setErrorMessage("");
    setIsModalOpen(false);
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const titulo = formData.titulo.trim();

    if (!titulo) {
      setErrorMessage("Informe o nome da etapa.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const isEditing = modalMode === "edit";
    const nextOrder = orderedStages.length + 1;
    const payload = {
      servico_id: serviceId,
      titulo,
      opcional: formData.opcional,
      ...(isEditing
        ? { updated_at: new Date().toISOString() }
        : {
            ordem: nextOrder,
            status: "Pendente",
          }),
    };

    const [{ error: stageError }, { error: eventError }] = await Promise.all([
      isEditing && editingStageId !== null
        ? supabase.from("servico_etapas").update(payload).eq("id", editingStageId)
        : supabase.from("servico_etapas").insert(payload),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "etapa",
        titulo: isEditing ? "Etapa atualizada" : "Nova etapa adicionada",
        descricao: isEditing
          ? `${titulo}${formData.opcional ? " (opcional)" : ""}`
          : `${titulo}${formData.opcional ? " (opcional)" : ""}`,
        criado_por: currentUserId || null,
      }),
    ]);

    setIsSaving(false);

    if (stageError || eventError) {
      setErrorMessage(
        isEditing
          ? "Não foi possível atualizar a etapa agora."
          : "Não foi possível adicionar a etapa agora."
      );
      return;
    }

    closeModal();
    router.refresh();
  }

  async function updateStageStatus(stage: ServicoEtapa, nextStatus: string) {
    if (!nextStatus || nextStatus === stage.status) {
      return;
    }

    setUpdatingStageId(stage.id);
    setErrorMessage("");

    const [{ error: stageError }, { error: eventError }] = await Promise.all([
      supabase
        .from("servico_etapas")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stage.id),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "etapa",
        titulo: "Etapa atualizada",
        descricao: `${stage.titulo ?? "Etapa"} alterada para ${nextStatus}.`,
        criado_por: currentUserId || null,
      }),
    ]);

    setUpdatingStageId(null);

    if (stageError || eventError) {
      setErrorMessage("Não foi possível atualizar a etapa agora.");
      return;
    }

    router.refresh();
  }

  async function updateStageOptional(stage: ServicoEtapa, nextOptional: boolean) {
    if (Boolean(stage.opcional) === nextOptional) {
      return;
    }

    setUpdatingStageId(stage.id);
    setErrorMessage("");

    const [{ error: stageError }, { error: eventError }] = await Promise.all([
      supabase
        .from("servico_etapas")
        .update({
          opcional: nextOptional,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stage.id),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "etapa",
        titulo: "Opcionalidade da etapa atualizada",
        descricao: `${stage.titulo ?? "Etapa"} marcada como ${
          nextOptional ? "opcional" : "obrigatoria"
        }.`,
        criado_por: currentUserId || null,
      }),
    ]);

    setUpdatingStageId(null);

    if (stageError || eventError) {
      setErrorMessage("Não foi possível atualizar a etapa agora.");
      return;
    }

    router.refresh();
  }

  async function moveStage(stage: ServicoEtapa, direction: "up" | "down") {
    const currentIndex = orderedStages.findIndex(
      (currentStage) => currentStage.id === stage.id
    );

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const targetStage = orderedStages[targetIndex];

    if (!targetStage) {
      return;
    }

    setReorderingStageId(stage.id);
    setErrorMessage("");

    const reorderedStages = [...orderedStages];
    [reorderedStages[currentIndex], reorderedStages[targetIndex]] = [
      reorderedStages[targetIndex],
      reorderedStages[currentIndex],
    ];

    const updates = reorderedStages.map((currentStage, index) =>
      supabase
        .from("servico_etapas")
        .update({
          ordem: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentStage.id)
    );

    const results = await Promise.all(updates);
    const stageError = results.find((result) => result.error)?.error;
    const { error: eventError } = await supabase.from("servico_eventos").insert({
      servico_id: serviceId,
      tipo: "etapa",
      titulo: "Etapas reordenadas",
      descricao: `${stage.titulo ?? "Etapa"} movida para ${
        direction === "up" ? "cima" : "baixo"
      }.`,
      criado_por: currentUserId || null,
    });

    setReorderingStageId(null);

    if (stageError || eventError) {
      setErrorMessage("Não foi possível reordenar as etapas agora.");
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
                Etapas do serviço
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Fluxo técnico com ordem, status e opcionalidade ajustáveis.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#204638]"
            >
              Nova etapa
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        {orderedStages.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">
            Nenhuma etapa cadastrada para este serviço.
          </div>
        ) : (
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {orderedStages.map((stage, index) => (
              <article
                key={stage.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Etapa {stage.ordem ?? index + 1}
                      </p>
                      {stage.opcional ? (
                        <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Opcional
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-[#17352b]">
                      {stage.titulo ?? "-"}
                    </h4>
                  </div>

                  <div className="flex items-start gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStageStatusClassName(
                        stage.status
                      )}`}
                    >
                      {stage.status ?? "-"}
                    </span>
                    <ActionsMenu
                      items={[
                        {
                          label: "Editar etapa",
                          onClick: () => openEditModal(stage),
                        },
                        {
                          label: "Mover para cima",
                          onClick: () => moveStage(stage, "up"),
                          disabled: index === 0 || reorderingStageId === stage.id,
                        },
                        {
                          label: "Mover para baixo",
                          onClick: () => moveStage(stage, "down"),
                          disabled:
                            index === orderedStages.length - 1 ||
                            reorderingStageId === stage.id,
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <select
                    value={stage.status ?? ""}
                    disabled={updatingStageId === stage.id}
                    onChange={(event) =>
                      updateStageStatus(stage, event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {stageStatusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={Boolean(stage.opcional)}
                    disabled={updatingStageId === stage.id}
                    onChange={(event) =>
                      updateStageOptional(stage, event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#17352b] focus:ring-[#17352b]/20"
                  />
                  Etapa opcional
                </label>
              </article>
            ))}
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                {modalMode === "edit" ? "Editar etapa" : "Nova etapa"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modalMode === "edit"
                  ? "Ajuste o nome e a natureza desta etapa."
                  : "Cadastre uma nova etapa para o fluxo do serviço."}
              </p>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-5">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Nome da etapa
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(event) => updateField("titulo", event.target.value)}
                      placeholder="Ex.: levantamento de documentos"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.opcional}
                      onChange={(event) =>
                        updateField("opcional", event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#17352b] focus:ring-[#17352b]/20"
                    />
                    Marcar esta etapa como opcional
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
