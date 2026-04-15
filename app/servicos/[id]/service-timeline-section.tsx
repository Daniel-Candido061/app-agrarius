"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatSimpleDate } from "../../../lib/date-utils";
import { supabase } from "../../../lib/supabase";
import { getUserLabel, type UserDisplayMap } from "../../../lib/user-profiles";
import type { ServicoEvento } from "../types";

type ServiceTimelineSectionProps = {
  serviceId: number;
  events: ServicoEvento[];
  currentUserId?: string | null;
  userDisplayNames?: UserDisplayMap;
};

function getEventBadgeClassName(type: string | null) {
  switch (type) {
    case "status":
      return "bg-sky-50 text-sky-700";
    case "pendencia":
      return "bg-amber-50 text-amber-700";
    case "etapa":
      return "bg-emerald-50 text-emerald-700";
    case "financeiro":
      return "bg-violet-50 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function ServiceTimelineSection({
  serviceId,
  events,
  currentUserId = null,
  userDisplayNames = {},
}: ServiceTimelineSectionProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAddEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setErrorMessage("Informe o título do evento.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase.from("servico_eventos").insert({
      servico_id: serviceId,
      tipo: "manual",
      titulo: trimmedTitle,
      descricao: trimmedDescription || null,
      criado_por: currentUserId || null,
    });

    setIsSaving(false);

    if (error) {
      setErrorMessage("Não foi possível adicionar o evento agora.");
      return;
    }

    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#17352b]">
              Timeline do serviço
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Histórico de movimentações relevantes da execução.
            </p>
          </div>

          <form
            onSubmit={handleAddEvent}
            className="grid w-full max-w-3xl gap-3 md:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)_auto]"
          >
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título do evento"
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
            />
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detalhe adicional"
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#204638] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Salvando..." : "Registrar"}
            </button>
          </form>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </div>

      {events.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-slate-500">
          Nenhum evento registrado para este serviço.
        </div>
      ) : (
        <div className="space-y-4 p-6">
          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getEventBadgeClassName(
                        event.tipo
                      )}`}
                    >
                      {event.tipo ?? "manual"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatSimpleDate(event.created_at)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {getUserLabel(userDisplayNames, event.criado_por)}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#17352b]">
                    {event.titulo ?? "-"}
                  </h4>
                  {event.descricao ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {event.descricao}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
