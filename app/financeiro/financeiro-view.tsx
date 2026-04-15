"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { ActiveFilterChips } from "../components/active-filter-chips";
import { ActionsMenu } from "../components/actions-menu";
import { PageTable } from "../components/page-table";
import { SearchableSelect } from "../components/searchable-select";
import { SummaryCard, SummaryCardsGrid } from "../components/summary-card";
import {
  fieldInputClassName,
  fieldSelectClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  toolbarSearchInputClassName,
  toolbarSelectClassName,
} from "../components/ui-patterns";
import { formatSimpleDate, getDateInputValue } from "../../lib/date-utils";
import {
  defaultPeriodValue,
  getAppliedQuickPeriodLabel,
  isDateInPeriod,
  quickPeriodOptions,
  type QuickPeriodValue,
  type PeriodValue,
} from "../../lib/period-utils";
import { supabase } from "../../lib/supabase";
import { getUserLabel, type UserDisplayMap } from "../../lib/user-profiles";
import { getCategoryOptionsByType } from "./category-options";
import type { LancamentoFinanceiro, ServicoOption } from "./types";

type FinanceiroViewProps = {
  entries: LancamentoFinanceiro[];
  services: ServicoOption[];
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserDetail?: string;
  currentUserInitials?: string;
  userDisplayNames?: UserDisplayMap;
};

type ModalMode = "create" | "edit";
type TimeFilterMode = "rapido" | "personalizado";

type FormData = {
  tipo: string;
  categoria: string;
  descricao: string;
  valor: string;
  data: string;
  servico_id: string;
  status: string;
};

type ServiceDetails = {
  clientName: string;
  serviceName: string;
};

const initialFormData: FormData = {
  tipo: "Receita",
  categoria: getCategoryOptionsByType("Receita")[0],
  descricao: "",
  valor: "",
  data: "",
  servico_id: "",
  status: "Pendente",
};

const financialDateLabel = "Data";

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

function getStatusOptionsByType(type: string) {
  return normalizeText(type) === "despesa"
    ? ["Pendente", "Pago", "Vencido"]
    : ["Pendente", "Recebido", "Vencido"];
}

function getServiceClientName(service: ServicoOption) {
  if (Array.isArray(service.cliente)) {
  return service.cliente[0]?.nome ?? "Cliente não encontrado";
  }

  return service.cliente?.nome ?? "Cliente não encontrado";
}

function entryMatchesSearch(
  entry: LancamentoFinanceiro,
  serviceDetails: ServiceDetails | undefined,
  serviceFallbackLabel: string,
  responsibleLabel: string,
  normalizedSearchTerm: string
) {
  if (!normalizedSearchTerm) {
    return true;
  }

  const searchableFields = [
    entry.descricao,
    entry.categoria,
    entry.tipo,
    entry.status,
    financialDateLabel,
    serviceDetails?.serviceName ?? serviceFallbackLabel,
    serviceDetails?.clientName,
    responsibleLabel,
    entry.valor === null || entry.valor === undefined
      ? null
      : String(entry.valor),
  ];

  return searchableFields.some((field) =>
    normalizeText(field).includes(normalizedSearchTerm)
  );
}

function getCustomPeriodLabel(startDate: string, endDate: string) {
  if (startDate && endDate) {
    return `${formatSimpleDate(startDate)} até ${formatSimpleDate(endDate)}`;
  }

  if (startDate) {
    return `a partir de ${formatSimpleDate(startDate)}`;
  }

  if (endDate) {
    return `até ${formatSimpleDate(endDate)}`;
  }

  return "Intervalo personalizado";
}

function buildSummaryCards(entries: LancamentoFinanceiro[]) {
  const receitasRecebidasEntries = entries.filter(
    (entry) =>
      normalizeText(entry.tipo) === "receita" &&
      normalizeText(entry.status) === "recebido"
  );
  const despesasPagasEntries = entries.filter(
    (entry) =>
      normalizeText(entry.tipo) === "despesa" &&
      normalizeText(entry.status) === "pago"
  );
  const receitasRecebidas = receitasRecebidasEntries.reduce(
    (total, entry) => total + getNumericValue(entry.valor),
    0
  );
  const despesasPagas = despesasPagasEntries.reduce(
    (total, entry) => total + getNumericValue(entry.valor),
    0
  );
  const lucroDoPeriodo = receitasRecebidas - despesasPagas;

  return [
    {
      title: "Receitas no período",
      value: `+${formatCurrency(receitasRecebidas)}`,
      detail: `${receitasRecebidasEntries.length} lançamentos recebidos`,
      valueClassName: "text-emerald-700",
      cardClassName: "border-emerald-200 bg-emerald-50/40",
      detailClassName: "text-emerald-700/80",
    },
    {
      title: "Despesas no período",
      value: `-${formatCurrency(despesasPagas)}`,
      detail: `${despesasPagasEntries.length} lançamentos pagos`,
      valueClassName: "text-orange-700",
      cardClassName: "border-orange-200 bg-orange-50/40",
      detailClassName: "text-orange-700/80",
    },
    {
      title: "Lucro no período",
      value: `${lucroDoPeriodo >= 0 ? "+" : "-"}${formatCurrency(
        Math.abs(lucroDoPeriodo)
      )}`,
      detail: "Receitas no período menos despesas no período",
      valueClassName:
        lucroDoPeriodo >= 0 ? "text-emerald-700" : "text-orange-700",
      cardClassName:
        lucroDoPeriodo >= 0
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-orange-200 bg-orange-50/30",
      detailClassName:
        lucroDoPeriodo >= 0 ? "text-emerald-700/80" : "text-orange-700/80",
    },
    {
      title: "Lançamentos no período",
      value: String(entries.length),
      detail: "Quantidade de lançamentos no resultado atual",
      valueClassName: "text-[#17352b]",
      cardClassName: "border-slate-200 bg-white",
      detailClassName: "text-slate-500",
    },
  ];
}

function getStatusClassName(status: string | null) {
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

function getEntryTypeMeta(type: string | null | undefined) {
  const normalizedType = normalizeText(type);

  if (normalizedType === "receita") {
    return {
      label: "Receita",
      badgeClassName:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      valueClassName: "text-emerald-700",
    };
  }

  if (normalizedType === "despesa") {
    return {
      label: "Despesa",
      badgeClassName:
        "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
      valueClassName: "text-orange-700",
    };
  }

  return {
    label: type ?? "-",
    badgeClassName: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    valueClassName: "text-slate-700",
  };
}

function formatSignedCurrency(
  value: number | string | null,
  type: string | null | undefined
) {
  const numericValue = getNumericValue(value);
  const formattedValue = formatCurrency(numericValue);
  const normalizedType = normalizeText(type);

  if (normalizedType === "receita") {
    return `+${formattedValue}`;
  }

  if (normalizedType === "despesa") {
    return `-${formattedValue}`;
  }

  return formattedValue;
}

export function FinanceiroView({
  entries,
  services,
  currentUserId = null,
  currentUserName,
  currentUserDetail,
  currentUserInitials,
  userDisplayNames = {},
}: FinanceiroViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilterMode, setTimeFilterMode] =
    useState<TimeFilterMode>("rapido");
  const [periodFilter, setPeriodFilter] =
    useState<QuickPeriodValue>(defaultPeriodValue);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);
  const serviceById = new Map(
    services.map((service) => [String(service.id), service])
  );
  const serviceDetailsById = new Map(
    services.map((service) => [
      String(service.id),
      {
        clientName: getServiceClientName(service),
        serviceName: service.nome_servico ?? `Serviço ${service.id}`,
      },
    ])
  );

  const activePeriod: PeriodValue =
    timeFilterMode === "personalizado" ? "personalizado" : periodFilter;
  const periodEntries = entries.filter((entry) =>
    isDateInPeriod(entry.data, activePeriod, customStartDate, customEndDate)
  );
  const categoryOptions = getCategoryOptionsByType(formData.tipo);
  const statusOptions = getStatusOptionsByType(formData.tipo);
  const serviceFallbackLabel = "Despesa geral da empresa";
  const selectedService = formData.servico_id
    ? serviceById.get(formData.servico_id)
    : null;
  const allStatusOptions = ["Pendente", "Recebido", "Pago", "Vencido"];
  const normalizedSearchTerm = normalizeText(searchTerm);
  const filteredEntries = periodEntries.filter((entry) => {
    const serviceDetails = serviceDetailsById.get(String(entry.servico_id));
    const responsibleLabel = getUserLabel(
      userDisplayNames,
      entry.responsavel_id
    );

    if (typeFilter && normalizeText(entry.tipo) !== normalizeText(typeFilter)) {
      return false;
    }

    if (
      statusFilter &&
      normalizeText(entry.status) !== normalizeText(statusFilter)
    ) {
      return false;
    }

    if (serviceFilter === "general") {
      if (entry.servico_id !== null && entry.servico_id !== undefined) {
        return false;
      }
    } else if (
      serviceFilter &&
      String(entry.servico_id ?? "") !== serviceFilter
    ) {
      return false;
    }

    if (responsavelFilter && responsibleLabel !== responsavelFilter) {
      return false;
    }

    return entryMatchesSearch(
      entry,
      serviceDetails,
      serviceFallbackLabel,
      responsibleLabel,
      normalizedSearchTerm
    );
  });
  const responsibleOptions = Array.from(
    new Set(
      periodEntries
        .map((entry) => getUserLabel(userDisplayNames, entry.responsavel_id))
        .filter((value) => value && value !== "-")
    )
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));
  const activeFilterChips = [
    searchTerm
      ? {
          key: "search",
          label: `Busca: ${searchTerm}`,
          onRemove: () => setSearchTerm(""),
        }
      : null,
    typeFilter
      ? {
          key: "tipo",
          label: `Tipo: ${typeFilter}`,
          onRemove: () => setTypeFilter(""),
        }
      : null,
    statusFilter
      ? {
          key: "status",
          label: `Status: ${statusFilter}`,
          onRemove: () => setStatusFilter(""),
        }
      : null,
    serviceFilter
      ? {
          key: "servico",
          label:
            serviceFilter === "general"
              ? `Servico: ${serviceFallbackLabel}`
              : `Servico: ${
                  serviceDetailsById.get(serviceFilter)?.serviceName ?? serviceFilter
                }`,
          onRemove: () => setServiceFilter(""),
        }
      : null,
    responsavelFilter
      ? {
          key: "responsavel",
          label: `Responsavel: ${responsavelFilter}`,
          onRemove: () => setResponsavelFilter(""),
        }
      : null,
  ].filter((chip) => chip !== null);
  const tableEntries = filteredEntries;
  const summaryCards = buildSummaryCards(tableEntries);
  const selectedTimeLabel =
    timeFilterMode === "rapido"
      ? `Período: ${getAppliedQuickPeriodLabel(periodFilter)}`
      : getCustomPeriodLabel(customStartDate, customEndDate);
  function openModal() {
    setModalMode("create");
    setEditingEntryId(null);
    setFormData(initialFormData);
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(entry: LancamentoFinanceiro) {
    const entryType = entry.tipo ?? "Receita";
    const entryStatusOptions = getStatusOptionsByType(entryType);

    setModalMode("edit");
    setEditingEntryId(entry.id);
    setFormData({
      tipo: entryType,
      categoria:
        entry.categoria ??
        getCategoryOptionsByType(entryType)[0],
      descricao: entry.descricao ?? "",
      valor:
        entry.valor === null || entry.valor === undefined
          ? ""
          : String(entry.valor),
      data: getDateInputValue(entry.data),
      servico_id:
        entry.servico_id === null || entry.servico_id === undefined
          ? ""
          : String(entry.servico_id),
      status:
        entry.status && entryStatusOptions.includes(entry.status)
          ? entry.status
          : entryStatusOptions[0],
    });
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalMode("create");
    setEditingEntryId(null);
    setErrorMessage("");
    setFormData(initialFormData);
  }

  function updateField(field: keyof FormData, value: string) {
    setFormData((currentData) => {
      if (field === "tipo") {
        const nextStatusOptions = getStatusOptionsByType(value);

        return {
          ...currentData,
          tipo: value,
          categoria: getCategoryOptionsByType(value)[0],
          status: nextStatusOptions.includes(currentData.status)
            ? currentData.status
            : nextStatusOptions[0],
        };
      }

      return {
        ...currentData,
        [field]: value,
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const tipo = formData.tipo.trim();
    const categoria = formData.categoria.trim();
    const descricao = formData.descricao.trim();
    const valor = formData.valor.trim();
    const data = formData.data.trim();
    const servicoId = formData.servico_id.trim();
    const status = formData.status.trim();

    if (!tipo) {
      setErrorMessage("Selecione o tipo do lançamento.");
      return;
    }

    if (!descricao) {
      setErrorMessage("Informe a descrição do lançamento.");
      return;
    }

    if (!categoria) {
      setErrorMessage("Selecione a categoria do lançamento.");
      return;
    }

    if (!valor) {
      setErrorMessage("Informe o valor do lançamento.");
      return;
    }

    if (!data) {
      setErrorMessage("Informe a data do lançamento.");
      return;
    }

    if (!status) {
      setErrorMessage("Selecione o status do lançamento.");
      return;
    }

    if (!getStatusOptionsByType(tipo).includes(status)) {
      setErrorMessage("Selecione um status compatível com o tipo do lançamento.");
      return;
    }

    const parsedValue = Number(valor.replace(",", "."));
    if (Number.isNaN(parsedValue)) {
      setErrorMessage("Informe um valor numerico valido.");
      return;
    }

    let parsedServiceId: number | null = null;

    if (servicoId) {
      parsedServiceId = Number(servicoId);
    }

    if (servicoId && Number.isNaN(parsedServiceId)) {
      setErrorMessage("Serviço inválido.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    
    const isEditing = modalMode === "edit";
    const entryId = editingEntryId;

    const entryPayload = {
      tipo,
      categoria,
      descricao,
      valor: parsedValue,
      data,
      servico_id: parsedServiceId,
      status,
      ...(isEditing
        ? {
            updated_at: new Date().toISOString(),
            atualizado_por: currentUserId || null,
          }
        : {
            criado_por: currentUserId || null,
            atualizado_por: currentUserId || null,
            responsavel_id: currentUserId || null,
          }),
    };

    const response =
      isEditing && entryId !== null
        ? await supabase
            .from("financeiro")
            .update(entryPayload)
            .eq("id", entryId)
            .select("id")
            .single()
        : await supabase
            .from("financeiro")
            .insert(entryPayload)
            .select("id")
            .single();

    setIsSaving(false);

    if (response.error) {
      setErrorMessage(
        isEditing
          ? "Não foi possível atualizar o lançamento agora. Tente novamente."
          : "Não foi possível salvar o lançamento agora. Tente novamente."
      );
      return;
    }

    if (isEditing && !response.data?.id) {
      setErrorMessage("Não foi possível identificar o lançamento atualizado.");
      return;
    }

    if (parsedServiceId !== null) {
      await supabase.from("servico_eventos").insert({
        servico_id: parsedServiceId,
        tipo: "financeiro",
        titulo: isEditing
          ? "Lancamento financeiro atualizado"
          : "Novo lancamento financeiro",
        descricao: `${tipo}: ${descricao} (${status}).`,
        criado_por: currentUserId || null,
      });
    }

    closeModal();
    router.refresh();
  }

  async function handleDelete(entry: LancamentoFinanceiro) {
    const shouldDelete = window.confirm("Tem certeza que deseja excluir?");

    if (!shouldDelete) {
      return;
    }

    setDeletingEntryId(entry.id);
    setErrorMessage("");

    const [{ error: deleteError }, { error: eventError }] = await Promise.all([
      supabase.from("financeiro").delete().eq("id", entry.id),
      entry.servico_id !== null && entry.servico_id !== undefined
        ? supabase.from("servico_eventos").insert({
            servico_id: Number(entry.servico_id),
            tipo: "financeiro",
            titulo: "Lancamento financeiro removido",
            descricao: entry.descricao ?? "Lancamento sem descricao",
            criado_por: currentUserId || null,
          })
        : Promise.resolve({ error: null }),
    ]);

    setDeletingEntryId(null);

    if (deleteError || eventError) {
      setErrorMessage(
        "Não foi possível excluir o lançamento agora. Tente novamente."
      );
      return;
    }

    router.refresh();
  }

  return (
    <>
      <AppShell
        title="Financeiro"
        description="Lançamentos reais sincronizados com a tabela financeiro do Supabase."
        currentPath="/financeiro"
        currentUserName={currentUserName}
        currentUserDetail={currentUserDetail}
        currentUserInitials={currentUserInitials}
        action={
          <button
            type="button"
            onClick={openModal}
            className={primaryButtonClassName}
          >
            Novo lançamento
          </button>
        }
      >
        <div className="space-y-6 sm:space-y-7">
          <section className="rounded-[24px] border border-slate-200 bg-white p-3.5 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.22)] sm:rounded-[28px] sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-3 xl:w-[280px] xl:shrink-0">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#17352b]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M7 3v3M17 3v3M4.5 9h15" strokeLinecap="round" />
                    <path
                      d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    Filtro de tempo
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#17352b] sm:text-base">
                    {selectedTimeLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Ajuste o recorte do financeiro e refine a listagem no mesmo contexto.
                  </p>
                </div>
              </div>

              <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(170px,0.9fr)_minmax(220px,1fr)_auto]">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Modo
                  <select
                    value={timeFilterMode}
                    onChange={(event) =>
                      setTimeFilterMode(event.target.value as TimeFilterMode)
                    }
                    className={toolbarSelectClassName}
                  >
                    <option value="rapido">Período rápido</option>
                    <option value="personalizado">Intervalo personalizado</option>
                  </select>
                </label>

                {timeFilterMode === "rapido" ? (
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                    Período
                    <select
                      value={periodFilter}
                      onChange={(event) =>
                        setPeriodFilter(event.target.value as QuickPeriodValue)
                      }
                      className={toolbarSelectClassName}
                    >
                      {quickPeriodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="grid gap-3 md:col-span-2 xl:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      Data inicial
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(event) =>
                          setCustomStartDate(event.target.value)
                        }
                        className={fieldInputClassName}
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      Data final
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(event) =>
                          setCustomEndDate(event.target.value)
                        }
                        className={fieldInputClassName}
                      />
                    </label>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("");
                    setStatusFilter("");
                    setServiceFilter("");
                    setResponsavelFilter("");
                  }}
                  className="w-full self-end rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 md:w-auto"
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
                Tipo
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className={toolbarSelectClassName}
                >
                  <option value="">Todos os tipos</option>
                  <option value="Receita">Receita</option>
                  <option value="Despesa">Despesa</option>
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={toolbarSelectClassName}
                >
                  <option value="">Todos os status</option>
                  {allStatusOptions.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
                Serviço
                <select
                  value={serviceFilter}
                  onChange={(event) => setServiceFilter(event.target.value)}
                  className={toolbarSelectClassName}
                >
                  <option value="">Todos os serviços</option>
                  <option value="general">{serviceFallbackLabel}</option>
                  {services.map((service) => (
                    <option key={service.id} value={String(service.id)}>
                      {service.nome_servico ?? `Serviço ${service.id}`} -{" "}
                      {getServiceClientName(service)}
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
            </div>
          </section>

          <ActiveFilterChips
            chips={activeFilterChips}
            totalLabel={`${filteredEntries.length} resultado${
              filteredEntries.length === 1 ? "" : "s"
            }`}
            onClearAll={() => {
              setSearchTerm("");
              setTypeFilter("");
              setStatusFilter("");
              setServiceFilter("");
              setResponsavelFilter("");
            }}
          />

          <section>
            <SummaryCardsGrid className="md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
              {summaryCards.map((card) => (
                <SummaryCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  detail={card.detail}
                  tone={
                    card.title === "Receitas no período"
                      ? "success"
                      : card.title === "Despesas no período"
                        ? "warning"
                        : card.title === "Lucro no período"
                          ? "info"
                          : "neutral"
                  }
                  valueClassName={card.valueClassName}
                  className={card.cardClassName}
                  compact
                />
              ))}
            </SummaryCardsGrid>
          </section>

          <div>
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Busca
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Digite cliente, serviço, descrição, categoria ou valor"
                className={toolbarSearchInputClassName}
              />
            </label>
          </div>

          <PageTable>
            {entries.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-[#17352b]">
                  Nenhum lançamento cadastrado
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Quando houver registros na tabela financeiro, eles aparecerão
                  aqui.
                </p>
              </div>
            ) : tableEntries.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-[#17352b]">
                  Nenhum resultado encontrado
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Tente buscar por outro termo para filtrar os lançamentos.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="min-w-[980px] divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Descrição
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Serviço
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Categoria
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Valor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {financialDateLabel}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableEntries.map((entry) => {
                      const serviceDetails = serviceDetailsById.get(
                        String(entry.servico_id)
                      );
                      const entryTypeMeta = getEntryTypeMeta(entry.tipo);
                      const responsavelLabel = getUserLabel(
                        userDisplayNames,
                        entry.responsavel_id
                      );
                      const autoriaLabel = getUserLabel(
                        userDisplayNames,
                        entry.atualizado_por ?? entry.criado_por
                      );

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${entryTypeMeta.badgeClassName}`}
                            >
                              {entryTypeMeta.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {entry.descricao ?? "-"}
                            <span className="mt-1 block text-xs text-slate-400">
                              Responsavel: {responsavelLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {serviceDetails?.clientName ?? "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {serviceDetails?.serviceName ?? serviceFallbackLabel}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {entry.categoria ?? "-"}
                          </td>
                          <td
                            className={`px-6 py-4 text-sm font-semibold ${entryTypeMeta.valueClassName}`}
                          >
                            {formatSignedCurrency(entry.valor, entry.tipo)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                                entry.status
                              )}`}
                            >
                              {entry.status ?? "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {formatSimpleDate(entry.data)}
                            <span className="mt-1 block text-xs text-slate-400">
                              Autor: {autoriaLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            <ActionsMenu
                              items={[
                                {
                                  label: "Editar",
                                  onClick: () => openEditModal(entry),
                                },
                                {
                                  label:
                                    deletingEntryId === entry.id
                                      ? "Excluindo..."
                                      : "Excluir",
                                  onClick: () => handleDelete(entry),
                                  disabled: deletingEntryId === entry.id,
                                  tone: "danger",
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PageTable>
        </div>
      </AppShell>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                {modalMode === "edit" ? "Editar lançamento" : "Novo lançamento"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modalMode === "edit"
                  ? "Atualize os dados do lançamento selecionado."
                  : "Preencha os campos abaixo para cadastrar um novo lançamento."}
              </p>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleSubmit}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Tipo
                  <select
                    value={formData.tipo}
                    onChange={(event) => updateField("tipo", event.target.value)}
                    className={fieldSelectClassName}
                  >
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                  </select>
                </label>

                <SearchableSelect
                  label="Serviço"
                  value={formData.servico_id}
                  onChange={(value) => updateField("servico_id", value)}
                  options={services.map((service) => {
                    const serviceName =
                      service.nome_servico ?? `Serviço ${service.id}`;
                    const clientName = getServiceClientName(service);

                    return {
                      value: String(service.id),
                      label: `${serviceName} - ${clientName}`,
                      searchText: `${serviceName} ${clientName}`,
                    };
                  })}
                  emptyOptionLabel={serviceFallbackLabel}
                  searchPlaceholder="Digite para buscar serviço ou cliente"
                  helperText={
                    selectedService
                      ? `Cliente relacionado: ${getServiceClientName(
                          selectedService
                        )}`
                      : "Use esta opção para despesas sem serviço vinculado."
                  }
                />

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Categoria
                  <select
                    value={formData.categoria}
                    onChange={(event) =>
                      updateField("categoria", event.target.value)
                    }
                    className={fieldSelectClassName}
                  >
                    {categoryOptions.map((categoryOption) => (
                      <option key={categoryOption} value={categoryOption}>
                        {categoryOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Descrição
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(event) =>
                      updateField("descricao", event.target.value)
                    }
                    placeholder="Digite a descrição do lançamento"
                    className={fieldInputClassName}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Valor
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(event) => updateField("valor", event.target.value)}
                    placeholder="0,00"
                    className={fieldInputClassName}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  {financialDateLabel}
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(event) => updateField("data", event.target.value)}
                    className={fieldInputClassName}
                  />
                  <span className="text-xs font-normal text-slate-500">
                    Para parcelas, cadastre cada data como um lançamento separado.
                  </span>
                </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className={fieldSelectClassName}
                    >
                      {statusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
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


