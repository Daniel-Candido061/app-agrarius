"use client";

import Link from "next/link";
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
import {
  getStatusClassName,
  normalizeStatusText,
} from "../components/status-utils";
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
import {
  getSituacaoOperacionalClassName,
  getSituacaoOperacionalLabel,
  getServiceDeadlineAlert,
  SERVICE_OPERATIONAL_STATUS_OPTIONS,
} from "./operational-utils";
import {
  getPendingTemplateByServiceType,
  getStageTemplateByServiceType,
} from "./service-templates";
import { SERVICE_STATUS_OPTIONS } from "./status-options";
import { SERVICE_TYPE_OPTIONS } from "./type-options";
import type { ClienteOption, Servico, ServicoFinanceiro } from "./types";

type ServicosViewProps = {
  services: Servico[];
  clients: ClienteOption[];
  financialEntries: ServicoFinanceiro[];
  currentUserId?: string | null;
  userDisplayNames?: UserDisplayMap;
  userOptions?: UserOption[];
  currentUserName?: string;
  currentUserDetail?: string;
  currentUserInitials?: string;
};

type ModalMode = "create" | "edit";
type ViewMode = "list" | "kanban";
type ServiceQuickFilter =
  | "all"
  | "inProgress"
  | "pastDue"
  | "openBalance"
  | "protocolado";

type FormData = {
  cliente_id: string;
  nome_servico: string;
  responsavel_id: string;
  tipo_servico: string;
  situacao_operacional: string;
  data_entrada: string;
  cidade: string;
  valor: string;
  prazo_final: string;
  observacoes: string;
  status: string;
};

const initialFormData: FormData = {
  cliente_id: "",
  nome_servico: "",
  responsavel_id: "",
  tipo_servico: SERVICE_TYPE_OPTIONS[0],
  situacao_operacional: "em_execucao_ativa",
  data_entrada: "",
  cidade: "",
  valor: "",
  prazo_final: "",
  observacoes: "",
  status: SERVICE_STATUS_OPTIONS[0],
};

const serviceQuickFilters = [
  {
    key: "all",
    label: "Todos",
  },
  {
    key: "inProgress",
    label: "Em andamento",
  },
  {
    key: "pastDue",
    label: "Atrasados",
  },
  {
    key: "openBalance",
    label: "Não quitados",
  },
  {
    key: "protocolado",
    label: "Protocolado",
  },
] satisfies Array<{
  key: ServiceQuickFilter;
  label: string;
}>;

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

function normalizeText(value: string | null) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function isPastDue(service: Servico) {
  if (!service.prazo_final) {
    return false;
  }

  const normalizedStatus = normalizeStatusText(service.status);
  const isClosedStatus =
    normalizedStatus === "entregue" ||
    normalizedStatus === "concluído" ||
    normalizedStatus === "concluido" ||
    normalizedStatus === "cancelado";

  if (isClosedStatus) {
    return false;
  }

  return isBeforeTodayDateOnly(service.prazo_final);
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

function getClientName(service: Servico) {
  if (Array.isArray(service.cliente)) {
    return service.cliente[0]?.nome ?? "Cliente não encontrado";
  }

  return service.cliente?.nome ?? "Cliente não encontrado";
}

function getServiceTone(status: string | null) {
  const normalizedStatus = normalizeStatusText(status);

  if (normalizedStatus === "concluido" || normalizedStatus === "entregue") {
    return "success" as const;
  }

  if (normalizedStatus === "em andamento") {
    return "info" as const;
  }

  if (normalizedStatus === "protocolado") {
    return "warning" as const;
  }

  if (normalizedStatus === "cancelado") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getOperationalSearchValue(value: string | null) {
  return value ? getSituacaoOperacionalLabel(value) : "";
}

function getServiceResponsibleLabel(
  service: Servico,
  userDisplayNames: UserDisplayMap
) {
  return getUserLabel(userDisplayNames, service.responsavel_id);
}

export function ServicosView({
  services,
  clients,
  financialEntries,
  currentUserId = null,
  userDisplayNames = {},
  userOptions = [],
  currentUserName,
  currentUserDetail,
  currentUserInitials,
}: ServicosViewProps) {
  const router = useRouter();
  const [serviceList, setServiceList] = useState(services);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFinanceService, setSelectedFinanceService] =
    useState<Servico | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [quickFilter, setQuickFilter] = useState<ServiceQuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(
    null
  );
  const [updatingServiceId, setUpdatingServiceId] = useState<number | null>(
    null
  );

  useEffect(() => {
    setServiceList(services);
  }, [services]);
  const defaultResponsibleId = currentUserId || userOptions[0]?.id || "";
  const receivedByServiceId = new Map<string, number>();

  financialEntries
    .filter(
      (entry) =>
        normalizeText(entry.tipo) === "receita" &&
        normalizeText(entry.status) === "recebido"
    )
    .forEach((entry) => {
      if (entry.servico_id === null || entry.servico_id === undefined) {
        return;
      }

      const serviceId = String(entry.servico_id);
      const currentTotal = receivedByServiceId.get(serviceId) ?? 0;

      receivedByServiceId.set(
        serviceId,
        currentTotal + formatCurrencyValue(entry.valor)
      );
    });

  const serviceBalances = serviceList.map((service) => {
    const valorContratado = formatCurrencyValue(service.valor);
    const totalRecebido = receivedByServiceId.get(String(service.id)) ?? 0;

    return {
      service,
      valorContratado,
      totalRecebido,
      valorEmAberto: valorContratado - totalRecebido,
    };
  });
  const balanceByServiceId = new Map(
    serviceBalances.map((summary) => [String(summary.service.id), summary])
  );
  const normalizedSearchTerm = normalizeText(searchTerm);
  const filteredServices = serviceList.filter((service) => {
    const summary = balanceByServiceId.get(String(service.id));
    const matchesStatus = !statusFilter || service.status === statusFilter;
    const matchesResponsible =
      !responsavelFilter ||
      getServiceResponsibleLabel(service, userDisplayNames) === responsavelFilter;

    if (!matchesStatus || !matchesResponsible) {
      return false;
    }

    if (quickFilter === "inProgress") {
      if (normalizeStatusText(service.status) !== "em andamento") {
        return false;
      }
    }

    if (quickFilter === "pastDue" && !isPastDue(service)) {
      return false;
    }

    if (
      quickFilter === "openBalance" &&
      (summary?.valorEmAberto ?? 0) <= 0
    ) {
      return false;
    }

    if (
      quickFilter === "protocolado" &&
      normalizeStatusText(service.status) !== "protocolado"
    ) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableFields = [
      getClientName(service),
      service.nome_servico,
      service.tipo_servico,
      getServiceResponsibleLabel(service, userDisplayNames),
      getOperationalSearchValue(service.situacao_operacional),
      service.cidade,
      service.status,
      formatSimpleDate(service.data_entrada),
      formatSimpleDate(service.created_at),
    ];

    return searchableFields.some((field) =>
      normalizeText(field).includes(normalizedSearchTerm)
    );
  });
  const unPaidServiceBalances = serviceBalances.filter(
    (summary) => summary.totalRecebido < summary.valorContratado
  );
  const completedServicesCount = serviceList.filter((service) => {
    const normalizedStatus = normalizeStatusText(service.status);

    return normalizedStatus === "concluido" || normalizedStatus === "entregue";
  }).length;
  const summaryCards = [
    {
      title: "Total de serviços",
      value: String(serviceList.length),
      detail: "Serviços cadastrados na operação.",
      tone: "neutral" as const,
    },
    {
      title: "Em andamento",
      value: String(
        serviceList.filter(
          (service) => normalizeStatusText(service.status) === "em andamento"
        ).length
      ),
      detail: "Serviços ativos no momento.",
      tone: "success" as const,
    },
    {
      title: "Concluídos",
      value: String(completedServicesCount),
      detail: "Serviços finalizados ou entregues.",
      tone: "info" as const,
    },
    {
      title: "Valor total",
      value: formatCurrency(
        serviceBalances.reduce(
          (total, summary) => total + summary.valorContratado,
          0
        )
      ),
      detail: "Soma dos valores contratados.",
      tone: "warning" as const,
    },
  ];
  const responsibleServiceInsights = Array.from(
    filteredServices.reduce(
      (map, service) => {
        const responsibleLabel = getServiceResponsibleLabel(
          service,
          userDisplayNames
        );
        const currentItem = map.get(responsibleLabel) ?? {
          label: responsibleLabel,
          active: 0,
          overdue: 0,
        };

        currentItem.active += 1;

        if (isPastDue(service)) {
          currentItem.overdue += 1;
        }

        map.set(responsibleLabel, currentItem);
        return map;
      },
      new Map<
        string,
        { label: string; active: number; overdue: number }
      >()
    ).values()
  )
    .sort((leftItem, rightItem) => {
      if (rightItem.overdue !== leftItem.overdue) {
        return rightItem.overdue - leftItem.overdue;
      }

      if (rightItem.active !== leftItem.active) {
        return rightItem.active - leftItem.active;
      }

      return leftItem.label.localeCompare(rightItem.label, "pt-BR");
    })
    .slice(0, 4)
    .map((item) => ({
      label: item.label,
      metric: String(item.active),
      detail:
        item.overdue > 0
          ? `${item.overdue} serviço(s) com prazo vencido dentro da carteira atual.`
          : "Carteira ativa sem vencimentos no recorte filtrado.",
      tone: item.overdue > 0 ? ("warning" as const) : ("info" as const),
    }));
  const quickFilterCounts = {
    all: serviceList.length,
    inProgress: serviceList.filter(
      (service) => normalizeStatusText(service.status) === "em andamento"
    ).length,
    pastDue: serviceList.filter(isPastDue).length,
    openBalance: serviceBalances.filter((summary) => summary.valorEmAberto > 0)
      .length,
    protocolado: serviceList.filter(
      (service) => normalizeStatusText(service.status) === "protocolado"
    ).length,
  } satisfies Record<ServiceQuickFilter, number>;
  const activeFilterChips = [
    searchTerm
      ? {
          key: "search",
          label: `Busca: ${searchTerm}`,
          onRemove: () => setSearchTerm(""),
        }
      : null,
    quickFilter !== "all"
      ? {
          key: "quick",
          label: `Atalho: ${
            serviceQuickFilters.find((filter) => filter.key === quickFilter)
              ?.label ?? quickFilter
          }`,
          onRemove: () => setQuickFilter("all"),
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
      serviceList
        .map((service) => getServiceResponsibleLabel(service, userDisplayNames))
        .filter((value) => value && value !== "-")
    )
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));
  const kanbanColumns: KanbanColumn<Servico>[] = SERVICE_STATUS_OPTIONS.map(
    (statusOption) => ({
      id: statusOption,
      title: statusOption,
      tone: getServiceTone(statusOption),
      items: filteredServices.filter(
        (service) => normalizeStatusText(service.status) === normalizeStatusText(statusOption)
      ),
      emptyMessage: "Nenhum serviço nesta etapa com os filtros atuais.",
    })
  );
  const selectedServiceEntries = selectedFinanceService
    ? financialEntries.filter(
        (entry) => String(entry.servico_id) === String(selectedFinanceService.id)
      )
    : [];
  const receitaTotal = selectedServiceEntries
    .filter(
      (entry) =>
        normalizeText(entry.tipo) === "receita" &&
        normalizeText(entry.status) === "recebido"
    )
    .reduce((total, entry) => total + Number(formatCurrencyValue(entry.valor)), 0);
  const despesaTotal = selectedServiceEntries
    .filter((entry) => normalizeText(entry.tipo) === "despesa")
    .reduce((total, entry) => total + Number(formatCurrencyValue(entry.valor)), 0);
  const selectedServiceContractValue = selectedFinanceService
    ? formatCurrencyValue(selectedFinanceService.valor)
    : 0;
  const selectedServiceOpenValue = selectedServiceContractValue - receitaTotal;

  function openModal() {
    setModalMode("create");
    setEditingServiceId(null);
    setFormData({
      ...initialFormData,
      responsavel_id: defaultResponsibleId,
    });
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openFinancialModal(service: Servico) {
    setSelectedFinanceService(service);
  }

  function openEditModal(service: Servico) {
    setModalMode("edit");
    setEditingServiceId(service.id);
    setFormData({
      cliente_id: service.cliente_id ? String(service.cliente_id) : "",
      nome_servico: service.nome_servico ?? "",
      responsavel_id: service.responsavel_id ?? defaultResponsibleId,
      tipo_servico: service.tipo_servico ?? SERVICE_TYPE_OPTIONS[0],
      situacao_operacional:
        service.situacao_operacional ?? "em_execucao_ativa",
      data_entrada: getDateInputValue(service.data_entrada ?? service.created_at),
      cidade: service.cidade ?? "",
      valor:
        service.valor === null || service.valor === undefined
          ? ""
          : String(service.valor),
      prazo_final: getDateInputValue(service.prazo_final),
      observacoes: service.observacoes ?? "",
      status: service.status ?? SERVICE_STATUS_OPTIONS[0],
    });
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalMode("create");
    setEditingServiceId(null);
    setErrorMessage("");
    setFormData(initialFormData);
  }

  function closeFinancialModal() {
    setSelectedFinanceService(null);
  }

  function updateField(field: keyof FormData, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function formatCurrencyValue(value: number | string | null) {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const numericValue =
      typeof value === "number"
        ? value
        : Number(String(value).replace(",", "."));

    return Number.isNaN(numericValue) ? 0 : numericValue;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clienteId = formData.cliente_id.trim();
    const nomeServico = formData.nome_servico.trim();
    const tipoServico = formData.tipo_servico.trim();
    const responsavelId =
      formData.responsavel_id.trim() || defaultResponsibleId || null;
    const situacaoOperacional = formData.situacao_operacional.trim();
    const dataEntrada = formData.data_entrada.trim();
    const cidade = formData.cidade.trim();
    const valor = formData.valor.trim();
    const prazoFinal = formData.prazo_final.trim();
    const observacoes = formData.observacoes.trim();
    const status = formData.status.trim();

    if (!clienteId) {
      setErrorMessage("Selecione um cliente.");
      return;
    }

    if (!nomeServico) {
      setErrorMessage("Informe o nome do serviço.");
      return;
    }

    if (!tipoServico) {
      setErrorMessage("Selecione o tipo do serviço.");
      return;
    }

    if (!status) {
      setErrorMessage("Selecione o status do serviço.");
      return;
    }

    if (!situacaoOperacional) {
      setErrorMessage("Selecione a situação operacional.");
      return;
    }

    const parsedClienteId = Number(clienteId);

    if (Number.isNaN(parsedClienteId)) {
      setErrorMessage("Cliente inválido.");
      return;
    }

    let parsedValor: number | null = null;

    if (valor) {
      parsedValor = Number(valor.replace(",", "."));

      if (Number.isNaN(parsedValor)) {
        setErrorMessage("Informe um valor numerico valido.");
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");
    
    const isEditing = modalMode === "edit";
    const serviceId = editingServiceId;

    const servicePayload = {
      cliente_id: parsedClienteId,
      nome_servico: nomeServico,
      responsavel_id: responsavelId,
      tipo_servico: tipoServico,
      situacao_operacional: situacaoOperacional,
      data_entrada: dataEntrada || null,
      cidade: cidade || null,
      valor: parsedValor,
      prazo_final: prazoFinal || null,
      observacoes: observacoes || null,
      status,
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

    const response =
      isEditing && serviceId !== null
        ? await supabase
            .from("servicos")
            .update(servicePayload)
            .eq("id", serviceId)
            .select("id")
            .single()
        : await supabase
            .from("servicos")
            .insert(servicePayload)
            .select("id")
            .single();

    setIsSaving(false);

    if (response.error) {
      setErrorMessage(
        isEditing
          ? "Não foi possível atualizar o serviço agora. Tente novamente."
          : "Não foi possível salvar o serviço agora. Tente novamente."
      );
      return;
    }

    if (isEditing && !response.data?.id) {
      setErrorMessage("Não foi possível identificar o serviço atualizado.");
      return;
    }

    if (!isEditing && response.data?.id) {
      const serviceId = response.data.id;
      const stageTitles = getStageTemplateByServiceType(tipoServico);
      const pendingTemplates = getPendingTemplateByServiceType(tipoServico);

      await supabase.from("servico_etapas").insert(
        stageTitles.map((title, index) => ({
          servico_id: serviceId,
          titulo: title,
          ordem: index + 1,
          status: index === 0 ? "Em andamento" : "Pendente",
        }))
      );

      if (pendingTemplates.length > 0) {
        await supabase.from("servico_pendencias").insert(
          pendingTemplates.map((pendingTemplate) => ({
            servico_id: serviceId,
            titulo: pendingTemplate.titulo,
            origem: pendingTemplate.origem,
            prioridade: pendingTemplate.prioridade ?? "media",
            status: "Aberta",
            criado_por: currentUserId || null,
            atualizado_por: currentUserId || null,
            responsavel_id: currentUserId || null,
          }))
        );
      }

      await supabase.from("servico_eventos").insert([
        {
          servico_id: serviceId,
          tipo: "sistema",
          titulo: "Serviço criado",
          descricao: `Serviço iniciado como ${tipoServico}.`,
          criado_por: currentUserId || null,
        },
        {
          servico_id: serviceId,
          tipo: "sistema",
          titulo: "Etapas iniciais geradas",
          descricao: `${stageTitles.length} etapas padrão foram criadas automaticamente.`,
          criado_por: currentUserId || null,
        },
        {
          servico_id: serviceId,
          tipo: "sistema",
          titulo: "Pendências iniciais sugeridas",
          descricao: `${pendingTemplates.length} pendência(s) padrão foram criadas automaticamente.`,
          criado_por: currentUserId || null,
        },
      ]);
    }

    closeModal();
    router.refresh();
  }

  async function handleDelete(service: Servico) {
    const shouldDelete = window.confirm("Tem certeza que deseja excluir?");

    if (!shouldDelete) {
      return;
    }

    setDeletingServiceId(service.id);
    setErrorMessage("");

    const { count: linkedFinancialEntriesCount, error: linkedFinancialEntriesError } =
      await supabase
        .from("financeiro")
        .select("id", { count: "exact", head: true })
        .eq("servico_id", service.id);

    if (linkedFinancialEntriesError) {
      setDeletingServiceId(null);
      setErrorMessage(
        "Não foi possível verificar os lançamentos financeiros vinculados a este serviço."
      );
      return;
    }

    if ((linkedFinancialEntriesCount ?? 0) > 0) {
      setDeletingServiceId(null);
      setErrorMessage(
        "Não é possível excluir este serviço porque ele possui lançamentos financeiros vinculados."
      );
      return;
    }

    const { error } = await supabase.from("servicos").delete().eq("id", service.id);

    setDeletingServiceId(null);

    if (error) {
      setErrorMessage("Não foi possível excluir o serviço agora. Tente novamente.");
      return;
    }

    router.refresh();
  }

  async function updateServiceStatus(service: Servico, nextStatus: string) {
    const trimmedStatus = nextStatus.trim();

    if (!trimmedStatus || trimmedStatus === service.status) {
      return;
    }

    setUpdatingServiceId(service.id);
    setErrorMessage("");
    setServiceList((currentServices) =>
      currentServices.map((currentService) =>
        currentService.id === service.id
          ? { ...currentService, status: trimmedStatus }
          : currentService
      )
    );

    const { error } = await supabase
      .from("servicos")
      .update({
        status: trimmedStatus,
        updated_at: new Date().toISOString(),
        atualizado_por: currentUserId || null,
      })
      .eq("id", service.id);

    setUpdatingServiceId(null);

    if (error) {
      setServiceList((currentServices) =>
        currentServices.map((currentService) =>
          currentService.id === service.id
            ? { ...currentService, status: service.status }
            : currentService
        )
      );
      setErrorMessage(
        "Não foi possível atualizar o status do serviço agora. Tente novamente."
      );
      return;
    }

    router.refresh();
  }

  function handleKanbanMove(serviceId: string, nextColumnId: string) {
    const service = serviceList.find(
      (currentService) => String(currentService.id) === serviceId
    );

    if (!service) {
      return;
    }

    updateServiceStatus(service, nextColumnId);
  }

  return (
    <>
      <AppShell
        title="Serviços"
        description="Lista de serviços sincronizada com os dados reais do Supabase."
        currentPath="/servicos"
        currentUserName={currentUserName}
        currentUserDetail={currentUserDetail}
        currentUserInitials={currentUserInitials}
        action={
          <button
            type="button"
            onClick={openModal}
            className={primaryButtonClassName}
          >
            Novo serviço
          </button>
        }
      >
        <PageToolbar>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Busca
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por cliente, serviço, tipo, operação ou status"
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
                  {SERVICE_STATUS_OPTIONS.map((statusOption) => (
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

          <div className="flex flex-wrap gap-2">
            {serviceQuickFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setQuickFilter(filter.key)}
                aria-pressed={quickFilter === filter.key}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                  quickFilter === filter.key
                    ? "border-[#17352b] bg-[#17352b] text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    quickFilter === filter.key
                      ? "bg-white/18 text-white"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {quickFilterCounts[filter.key]}
                </span>
              </button>
            ))}
          </div>

          <ActiveFilterChips
            chips={activeFilterChips}
            totalLabel={`${filteredServices.length} resultado${
              filteredServices.length === 1 ? "" : "s"
            }`}
            onClearAll={() => {
              setSearchTerm("");
              setQuickFilter("all");
              setStatusFilter("");
              setResponsavelFilter("");
            }}
          />
        </PageToolbar>

        <section className="mb-6">
          <SummaryCardsGrid className="2xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                tone={card.tone}
              />
            ))}
          </SummaryCardsGrid>
        </section>

        <section className="mb-6">
          <ResponsibleInsights
            title="Carteira por responsável"
            description="Quem está concentrando mais serviços dentro do recorte atual."
            emptyMessage="A distribuição por responsável aparecerá aqui quando houver serviços no resultado atual."
            items={responsibleServiceInsights}
          />
        </section>

        <PageTable>
          {serviceList.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum serviço cadastrado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver registros na tabela serviços, eles aparecerão aqui.
              </p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum serviço encontrado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Tente selecionar outro status para refinar a lista.
              </p>
            </div>
          ) : viewMode === "kanban" ? (
            <div className="p-4 sm:p-5">
              <KanbanBoard
                columns={kanbanColumns}
                getItemKey={(service) => String(service.id)}
                onMoveItem={handleKanbanMove}
                renderCard={(service) => {
                  const detailsPath = `/servicos/${service.id}`;
                  const summary = balanceByServiceId.get(String(service.id));
                  const deadlineAlert = getServiceDeadlineAlert({
                    prazoFinal: service.prazo_final,
                    status: service.status,
                  });

                  return (
                    <article
                      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.26)] ${
                        deadlineAlert?.tone === "danger"
                          ? "ring-1 ring-rose-200"
                          : deadlineAlert?.tone === "warning"
                            ? "ring-1 ring-amber-200"
                            : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#17352b]">
                            {service.nome_servico ?? "-"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {getClientName(service)}
                          </p>
                          <p className="mt-2 truncate text-xs text-slate-400">
                            Responsável:{" "}
                            {getServiceResponsibleLabel(service, userDisplayNames)}
                          </p>
                          <span
                            className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSituacaoOperacionalClassName(
                              service.situacao_operacional
                            )}`}
                          >
                            {getSituacaoOperacionalLabel(
                              service.situacao_operacional
                            )}
                          </span>
                          {deadlineAlert ? (
                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                deadlineAlert.tone === "danger"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {deadlineAlert.label}
                            </span>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => openFinancialModal(service)}
                          className="inline-flex shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Financeiro
                        </button>
                      </div>

                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span>Tipo</span>
                          <span className="font-medium text-slate-700">
                            {service.tipo_servico ?? "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Cidade</span>
                          <span className="font-medium text-slate-700">
                            {service.cidade ?? "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Operação</span>
                          <span className="font-medium text-slate-700">
                            {getSituacaoOperacionalLabel(
                              service.situacao_operacional
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Responsável</span>
                          <span className="font-medium text-slate-700">
                            {getServiceResponsibleLabel(service, userDisplayNames)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Entrega</span>
                          <span
                            className={
                              deadlineAlert?.tone === "danger"
                                ? "font-medium text-rose-700"
                                : deadlineAlert?.tone === "warning"
                                  ? "font-medium text-amber-700"
                                : "font-medium text-slate-700"
                            }
                          >
                            {formatSimpleDate(service.prazo_final)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Em aberto</span>
                          <span className="font-medium text-amber-700">
                            {formatCurrency(summary?.valorEmAberto ?? 0)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <select
                          value={service.status ?? ""}
                          disabled={updatingServiceId === service.id}
                          onChange={(event) =>
                            updateServiceStatus(service, event.target.value)
                          }
                          className={`h-10 w-full rounded-xl px-3 py-2 text-sm font-medium outline-none transition focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70 ${getStatusClassName(
                            service.status
                          )}`}
                          aria-label={`Alterar status do servico ${service.nome_servico ?? service.id}`}
                        >
                          {SERVICE_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <Link
                          href={detailsPath}
                          className="text-sm font-semibold text-[#17352b] transition hover:text-[#204638]"
                        >
                          Ver detalhes
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(service)}
                          className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
                        >
                          Editar
                        </button>
                      </div>
                    </article>
                  );
                }}
              />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-[860px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Nome do serviço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cidade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Operação
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Valor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Prazo de entrega
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
                  {filteredServices.map((service) => {
                    const detailsPath = `/servicos/${service.id}`;
                    const deadlineAlert = getServiceDeadlineAlert({
                      prazoFinal: service.prazo_final,
                      status: service.status,
                    });

                    return (
                      <tr
                        key={service.id}
                        onClick={() => router.push(detailsPath)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(detailsPath);
                          }
                        }}
                        role="link"
                        tabIndex={0}
                        className={`cursor-pointer hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#17352b]/20 ${
                          deadlineAlert?.tone === "danger"
                            ? "bg-rose-50/70"
                            : deadlineAlert?.tone === "warning"
                              ? "bg-amber-50/60"
                              : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {getClientName(service)}
                        </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <Link
                          href={detailsPath}
                          className="font-medium text-[#17352b] transition hover:text-[#204638]"
                        >
                          {service.nome_servico ?? "-"}
                        </Link>
                        <span className="mt-1 block text-xs text-slate-500">
                          {service.tipo_servico ?? "Sem tipo"}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          Responsável:{" "}
                          {getServiceResponsibleLabel(service, userDisplayNames)}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          Entrada: {formatSimpleDate(service.data_entrada ?? service.created_at)}
                        </span>
                      </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {service.cidade ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSituacaoOperacionalClassName(
                              service.situacao_operacional
                            )}`}
                          >
                            {getSituacaoOperacionalLabel(
                              service.situacao_operacional
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatCurrency(service.valor)}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            deadlineAlert?.tone === "danger"
                              ? "font-medium text-rose-700"
                              : deadlineAlert?.tone === "warning"
                                ? "font-medium text-amber-700"
                              : "text-slate-500"
                          }`}
                        >
                          {formatSimpleDate(service.prazo_final)}
                          {deadlineAlert ? (
                            <span
                              className={`mt-1 block text-xs font-medium ${
                                deadlineAlert.tone === "danger"
                                  ? "text-rose-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {deadlineAlert.label}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            className="min-w-[180px]"
                          >
                            <select
                              value={service.status ?? ""}
                              disabled={updatingServiceId === service.id}
                              onChange={(event) =>
                                updateServiceStatus(service, event.target.value)
                              }
                              className={`h-10 w-full rounded-xl px-3 py-2 text-sm leading-5 font-medium outline-none transition focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70 ${getStatusClassName(
                                service.status
                              )}`}
                              aria-label={`Alterar status do serviço ${service.nome_servico ?? service.id}`}
                            >
                              {SERVICE_STATUS_OPTIONS.map((statusOption) => (
                                <option key={statusOption} value={statusOption}>
                                  {statusOption}
                                </option>
                              ))}
                            </select>
                            {updatingServiceId === service.id ? (
                              <p className="mt-1 text-xs text-slate-400">
                                Salvando alteração...
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <ActionsMenu
                            items={[
                              {
                                label: "Ver detalhes",
                                href: detailsPath,
                              },
                              {
                                label: "Financeiro",
                                onClick: () => openFinancialModal(service),
                              },
                              {
                                label: "Editar",
                                onClick: () => openEditModal(service),
                              },
                              {
                                label:
                                  deletingServiceId === service.id
                                    ? "Excluindo..."
                                    : "Excluir",
                                onClick: () => handleDelete(service),
                                disabled: deletingServiceId === service.id,
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

        <PageTable className="mt-6">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#17352b]">
                  Serviços não quitados
                </h2>
                <p className="text-sm text-slate-500">
                  Saldos calculados pelo valor contratado menos receitas recebidas.
                </p>
              </div>

              <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {unPaidServiceBalances.length} em aberto
              </span>
            </div>
          </div>

          {unPaidServiceBalances.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-emerald-700">
                Nenhum serviço em aberto no momento
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Todos os serviços cadastrados estão quitados.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-[860px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Nome do serviço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Valor contratado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Total recebido
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Valor em aberto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unPaidServiceBalances.map((summary) => (
                    <tr key={summary.service.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {getClientName(summary.service)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <Link
                          href={`/servicos/${summary.service.id}`}
                          className="font-medium text-[#17352b] transition hover:text-[#204638]"
                        >
                          {summary.service.nome_servico ?? "-"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatCurrency(summary.valorContratado)}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-700">
                        {formatCurrency(summary.totalRecebido)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-amber-700">
                        {formatCurrency(summary.valorEmAberto)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                            summary.service.status
                          )}`}
                        >
                          {summary.service.status ?? "Sem status"}
                        </span>
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
                {modalMode === "edit" ? "Editar serviço" : "Novo serviço"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modalMode === "edit"
                  ? "Atualize os dados do serviço selecionado."
                  : "Preencha os campos abaixo para cadastrar um novo serviço."}
              </p>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleSubmit}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                <SearchableSelect
                  label="Cliente"
                  value={formData.cliente_id}
                  onChange={(value) => updateField("cliente_id", value)}
                  options={clients.map((client) => ({
                    value: String(client.id),
                    label: client.nome,
                  }))}
                  emptyOptionLabel="Selecione um cliente"
                  searchPlaceholder="Digite para buscar um cliente"
                  className="sm:col-span-2"
                />

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Nome do serviço
                  <input
                    type="text"
                    value={formData.nome_servico}
                    onChange={(event) =>
                      updateField("nome_servico", event.target.value)
                    }
                    placeholder="Digite o nome do serviço"
                    className={fieldInputClassName}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Tipo de serviço
                  <select
                    value={formData.tipo_servico}
                    onChange={(event) =>
                      updateField("tipo_servico", event.target.value)
                    }
                    className={fieldSelectClassName}
                  >
                    {SERVICE_TYPE_OPTIONS.map((typeOption) => (
                      <option key={typeOption} value={typeOption}>
                        {typeOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Responsável
                  <select
                    value={formData.responsavel_id}
                    onChange={(event) =>
                      updateField("responsavel_id", event.target.value)
                    }
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
                  Data de entrada
                  <input
                    type="date"
                    value={formData.data_entrada}
                    onChange={(event) =>
                      updateField("data_entrada", event.target.value)
                    }
                    className={fieldInputClassName}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Cidade
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(event) => updateField("cidade", event.target.value)}
                    placeholder="Cidade - UF"
                    className={fieldInputClassName}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Situação operacional
                  <select
                    value={formData.situacao_operacional}
                    onChange={(event) =>
                      updateField("situacao_operacional", event.target.value)
                    }
                    className={fieldSelectClassName}
                  >
                    {SERVICE_OPERATIONAL_STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {getSituacaoOperacionalLabel(statusOption)}
                      </option>
                    ))}
                  </select>
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
                  Prazo de entrega
                  <input
                    type="date"
                    value={formData.prazo_final}
                    onChange={(event) =>
                      updateField("prazo_final", event.target.value)
                    }
                    className={fieldInputClassName}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Observação
                  <textarea
                    value={formData.observacoes}
                    onChange={(event) =>
                      updateField("observacoes", event.target.value)
                    }
                    rows={4}
                    placeholder="Digite observações técnicas e operacionais"
                    className={fieldTextareaClassName}
                  />
                </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className={fieldSelectClassName}
                    >
                      {SERVICE_STATUS_OPTIONS.map((statusOption) => (
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

      {selectedFinanceService ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-[#17352b]">
                  Financeiro do serviço
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedFinanceService.nome_servico ?? `Serviço ${selectedFinanceService.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFinancialModal}
                className={`${secondaryButtonClassName} min-h-10 px-4 py-2`}
              >
                Fechar
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-sm font-medium text-slate-500">
                    Receitas recebidas
                  </p>
                  <strong className="mt-3 block text-2xl font-semibold text-[#17352b]">
                    {formatCurrency(receitaTotal)}
                  </strong>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-sm font-medium text-slate-500">
                    Valor em aberto
                  </p>
                  <strong className="mt-3 block text-2xl font-semibold text-[#17352b]">
                    {formatCurrency(selectedServiceOpenValue)}
                  </strong>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-sm font-medium text-slate-500">Despesas</p>
                  <strong className="mt-3 block text-2xl font-semibold text-[#17352b]">
                    {formatCurrency(despesaTotal)}
                  </strong>
                </article>
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200">
                {selectedServiceEntries.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <h3 className="text-lg font-semibold text-[#17352b]">
                      Nenhum lançamento vinculado
                    </h3>
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
                        {selectedServiceEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">
                              {entry.tipo ?? "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {entry.descricao ?? "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
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
          </div>
        </div>
      ) : null}
    </>
  );
}


