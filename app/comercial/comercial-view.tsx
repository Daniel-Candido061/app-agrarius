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
  formatSimpleDate,
  getDateInputValue,
  isBeforeTodayDateOnly,
} from "../../lib/date-utils";
import { supabase } from "../../lib/supabase";
import { CLIENT_STATUS_OPTIONS } from "../clientes/status-options";
import {
  getPendingTemplateByServiceType,
  getStageTemplateByServiceType,
} from "../servicos/service-templates";
import {
  getSituacaoOperacionalLabel,
  SERVICE_OPERATIONAL_STATUS_OPTIONS,
} from "../servicos/operational-utils";
import { SERVICE_STATUS_OPTIONS } from "../servicos/status-options";
import { SERVICE_TYPE_OPTIONS } from "../servicos/type-options";
import type { ClienteOption } from "../servicos/types";
import {
  getUserLabel,
  type UserDisplayMap,
  type UserOption,
} from "../../lib/user-profiles";
import { withOrganizationId } from "../../lib/organization-scope";
import { COMMERCIAL_STATUS_OPTIONS } from "./status-options";
import type { PropostaComercial } from "./types";

type ComercialViewProps = {
  proposals: PropostaComercial[];
  clients: ClienteOption[];
  currentUserId?: string | null;
  currentOrganizationId?: string | null;
  currentUserName?: string;
  currentUserDetail?: string;
  currentUserInitials?: string;
  userDisplayNames?: UserDisplayMap;
  userOptions?: UserOption[];
};

type ModalMode = "create" | "edit";
type ViewMode = "list" | "kanban";
type CommercialQuickFilter = "all" | "followUp" | "open" | "won" | "lost";
type ConversionClientMode = "existing" | "new";

type FormData = {
  nome_oportunidade: string;
  nome_contato: string;
  empresa: string;
  telefone: string;
  cidade: string;
  origem: string;
  tipo_servico: string;
  valor_estimado: string;
  proxima_acao_data: string;
  status: string;
  responsavel_id: string;
  motivo_perda: string;
  observacoes: string;
};

type ConversionFormData = {
  clientMode: ConversionClientMode;
  existingClientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientCity: string;
  clientStatus: string;
  serviceName: string;
  serviceType: string;
  serviceEntryDate: string;
  serviceCity: string;
  serviceValue: string;
  serviceDeadline: string;
  serviceStatus: string;
  serviceOperationalStatus: string;
  serviceResponsavelId: string;
  serviceNotes: string;
};

const initialFormData: FormData = {
  nome_oportunidade: "",
  nome_contato: "",
  empresa: "",
  telefone: "",
  cidade: "",
  origem: "",
  tipo_servico: "",
  valor_estimado: "",
  proxima_acao_data: "",
  status: COMMERCIAL_STATUS_OPTIONS[0],
  responsavel_id: "",
  motivo_perda: "",
  observacoes: "",
};

const initialConversionFormData: ConversionFormData = {
  clientMode: "new",
  existingClientId: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  clientCity: "",
  clientStatus: CLIENT_STATUS_OPTIONS[0],
  serviceName: "",
  serviceType: SERVICE_TYPE_OPTIONS[0],
  serviceEntryDate: "",
  serviceCity: "",
  serviceValue: "",
  serviceDeadline: "",
  serviceStatus: "Em andamento",
  serviceOperationalStatus: "em_execucao_ativa",
  serviceResponsavelId: "",
  serviceNotes: "",
};

const quickFilters = [
  { key: "all", label: "Todas" },
  { key: "followUp", label: "Follow-up vencido" },
  { key: "open", label: "Em andamento" },
  { key: "won", label: "Ganhas" },
  { key: "lost", label: "Perdidas" },
] satisfies Array<{ key: CommercialQuickFilter; label: string }>;

function normalizeText(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

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

function isLostProposal(proposal: PropostaComercial) {
  return normalizeText(proposal.status) === "perdido";
}

function isWonProposal(proposal: PropostaComercial) {
  return normalizeText(proposal.status) === "ganho";
}

function isOpenProposal(proposal: PropostaComercial) {
  return !isWonProposal(proposal) && !isLostProposal(proposal);
}

function isConvertedProposal(proposal: PropostaComercial) {
  return isWonProposal(proposal) && Boolean(proposal.servico_id || proposal.convertido_em);
}

function hasConversionHistory(proposal: PropostaComercial) {
  return !isConvertedProposal(proposal) && Boolean(proposal.servico_id || proposal.convertido_em);
}

function isFollowUpOverdue(proposal: PropostaComercial) {
  if (!proposal.proxima_acao_data || !isOpenProposal(proposal)) {
    return false;
  }

  return isBeforeTodayDateOnly(proposal.proxima_acao_data);
}

function getSuggestedOperationalStatus(serviceStatus: string | null | undefined) {
  const normalizedStatus = normalizeText(serviceStatus);

  if (normalizedStatus === "protocolado") {
    return "aguardando_orgao";
  }

  if (normalizedStatus === "concluido" || normalizedStatus === "entregue") {
    return "pronto_para_entregar";
  }

  return "em_execucao_ativa";
}

function getCommercialTone(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "ganho") {
    return "success" as const;
  }

  if (normalizedStatus === "perdido") {
    return "danger" as const;
  }

  if (normalizedStatus === "negociacao") {
    return "warning" as const;
  }

  if (normalizedStatus === "proposta enviada") {
    return "info" as const;
  }

  return "neutral" as const;
}

function getStatusBadgeClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "ganho") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "perdido") {
    return "bg-rose-50 text-rose-700";
  }

  if (normalizedStatus === "negociacao") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "proposta enviada") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getProposalDisplayName(proposal: PropostaComercial) {
  return proposal.empresa ?? proposal.nome_contato ?? "Sem empresa";
}

function getProposalClientName(proposal: PropostaComercial) {
  return proposal.empresa?.trim() || proposal.nome_contato?.trim() || "";
}

function getProposalContactName(proposal: PropostaComercial) {
  return proposal.nome_contato?.trim() || proposal.empresa?.trim() || "";
}

function getProposalResponsibleLabel(
  proposal: PropostaComercial,
  userDisplayNames: UserDisplayMap
) {
  return getUserLabel(userDisplayNames, proposal.responsavel_id);
}

export function ComercialView({
  proposals,
  clients,
  currentUserId = null,
  currentOrganizationId = null,
  currentUserName,
  currentUserDetail,
  currentUserInitials,
  userDisplayNames = {},
  userOptions = [],
}: ComercialViewProps) {
  const router = useRouter();
  const [proposalList, setProposalList] = useState(proposals);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [quickFilter, setQuickFilter] =
    useState<CommercialQuickFilter>("all");
  const [editingProposalId, setEditingProposalId] = useState<number | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProposalId, setDeletingProposalId] = useState<number | null>(
    null
  );
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [convertingProposal, setConvertingProposal] =
    useState<PropostaComercial | null>(null);
  const [conversionFormData, setConversionFormData] = useState<ConversionFormData>(
    initialConversionFormData
  );
  const [conversionErrorMessage, setConversionErrorMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    setProposalList(proposals);
  }, [proposals]);
  const defaultResponsibleId = currentUserId || userOptions[0]?.id || "";

  const normalizedSearchTerm = normalizeText(searchTerm);
  const filteredProposals = proposalList.filter((proposal) => {
    if (statusFilter && proposal.status !== statusFilter) {
      return false;
    }

    if (
      responsavelFilter &&
      getProposalResponsibleLabel(proposal, userDisplayNames) !== responsavelFilter
    ) {
      return false;
    }

    if (quickFilter === "followUp" && !isFollowUpOverdue(proposal)) {
      return false;
    }

    if (quickFilter === "open" && !isOpenProposal(proposal)) {
      return false;
    }

    if (quickFilter === "won" && !isWonProposal(proposal)) {
      return false;
    }

    if (quickFilter === "lost" && !isLostProposal(proposal)) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableFields = [
      proposal.nome_oportunidade,
      proposal.nome_contato,
      proposal.empresa,
      proposal.telefone,
      proposal.cidade,
      proposal.origem,
      proposal.tipo_servico,
      proposal.status,
      getProposalResponsibleLabel(proposal, userDisplayNames),
    ];

    return searchableFields.some((field) =>
      normalizeText(field).includes(normalizedSearchTerm)
    );
  });

  const summaryCards = [
    {
      title: "Total de propostas",
      value: String(proposalList.length),
      detail: "Entradas comerciais registradas no funil.",
      tone: "neutral" as const,
    },
    {
      title: "Em andamento",
      value: String(proposalList.filter(isOpenProposal).length),
      detail: "Oportunidades ainda em acompanhamento.",
      tone: "info" as const,
    },
    {
      title: "Ganhas",
      value: String(proposalList.filter(isWonProposal).length),
      detail: "Propostas convertidas em negócio.",
      tone: "success" as const,
    },
    {
      title: "Valor estimado aberto",
      value: formatCurrency(
        proposalList
          .filter(isOpenProposal)
          .reduce(
            (total, proposal) => total + getNumericValue(proposal.valor_estimado),
            0
          )
      ),
      detail: "Soma do potencial comercial ainda em disputa.",
      tone: "warning" as const,
    },
  ];
  const responsibleProposalInsights = Array.from(
    filteredProposals.reduce(
      (map, proposal) => {
        const responsibleLabel = getProposalResponsibleLabel(
          proposal,
          userDisplayNames
        );
        const currentItem = map.get(responsibleLabel) ?? {
          label: responsibleLabel,
          open: 0,
          followUp: 0,
        };

        if (isOpenProposal(proposal)) {
          currentItem.open += 1;
        }

        if (isFollowUpOverdue(proposal)) {
          currentItem.followUp += 1;
        }

        map.set(responsibleLabel, currentItem);
        return map;
      },
      new Map<
        string,
        { label: string; open: number; followUp: number }
      >()
    ).values()
  )
    .sort((leftItem, rightItem) => {
      if (rightItem.followUp !== leftItem.followUp) {
        return rightItem.followUp - leftItem.followUp;
      }

      if (rightItem.open !== leftItem.open) {
        return rightItem.open - leftItem.open;
      }

      return leftItem.label.localeCompare(rightItem.label, "pt-BR");
    })
    .slice(0, 4)
    .map((item) => ({
      label: item.label,
      metric: String(item.open),
      detail:
        item.followUp > 0
          ? `${item.followUp} proposta(s) pedindo próximo contato.`
          : "Carteira comercial em acompanhamento no recorte atual.",
      tone: item.followUp > 0 ? ("warning" as const) : ("info" as const),
    }));
  const conversionStagePreview = getStageTemplateByServiceType(
    conversionFormData.serviceType
  );
  const conversionPendingPreview = getPendingTemplateByServiceType(
    conversionFormData.serviceType
  );
  const conversionResponsibleLabel =
    userOptions.find(
      (userOption) => userOption.id === conversionFormData.serviceResponsavelId
    )?.label ?? "Responsável não definido";
  const selectedExistingClientName =
    clients.find(
      (client) => String(client.id) === conversionFormData.existingClientId
    )?.nome ?? "Cliente não selecionado";

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
            quickFilters.find((filter) => filter.key === quickFilter)?.label ??
            quickFilter
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
      proposalList
        .map((proposal) =>
          getProposalResponsibleLabel(proposal, userDisplayNames)
        )
        .filter((value) => value && value !== "-")
    )
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));

  const quickFilterCounts = {
    all: proposalList.length,
    followUp: proposalList.filter(isFollowUpOverdue).length,
    open: proposalList.filter(isOpenProposal).length,
    won: proposalList.filter(isWonProposal).length,
    lost: proposalList.filter(isLostProposal).length,
  } satisfies Record<CommercialQuickFilter, number>;

  const kanbanColumns: KanbanColumn<PropostaComercial>[] =
    COMMERCIAL_STATUS_OPTIONS.map((statusOption) => ({
      id: statusOption,
      title: statusOption,
      tone: getCommercialTone(statusOption),
      items: filteredProposals.filter((proposal) => proposal.status === statusOption),
      emptyMessage: "Nenhuma proposta nesta etapa com os filtros atuais.",
    }));

  function openModal() {
    setModalMode("create");
    setEditingProposalId(null);
    setFormData({
      ...initialFormData,
      responsavel_id: defaultResponsibleId,
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(proposal: PropostaComercial) {
    setModalMode("edit");
    setEditingProposalId(proposal.id);
    setFormData({
      nome_oportunidade: proposal.nome_oportunidade ?? "",
      nome_contato: proposal.nome_contato ?? "",
      empresa: proposal.empresa ?? "",
      telefone: proposal.telefone ?? "",
      cidade: proposal.cidade ?? "",
      origem: proposal.origem ?? "",
      tipo_servico: proposal.tipo_servico ?? "",
      valor_estimado:
        proposal.valor_estimado === null || proposal.valor_estimado === undefined
          ? ""
          : String(proposal.valor_estimado),
      proxima_acao_data: getDateInputValue(proposal.proxima_acao_data),
      status: proposal.status ?? COMMERCIAL_STATUS_OPTIONS[0],
      responsavel_id: proposal.responsavel_id ?? defaultResponsibleId,
      motivo_perda: proposal.motivo_perda ?? "",
      observacoes: proposal.observacoes ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setModalMode("create");
    setEditingProposalId(null);
    setIsModalOpen(false);
    setErrorMessage("");
    setFormData(initialFormData);
  }

  function openConversionModal(proposal: PropostaComercial) {
    const matchedClient = clients.find(
      (client) => normalizeText(client.nome) === normalizeText(proposal.empresa)
    );

    setConvertingProposal(proposal);
    setConversionFormData({
      clientMode: matchedClient ? "existing" : "new",
      existingClientId: matchedClient ? String(matchedClient.id) : "",
      clientName: getProposalClientName(proposal),
      clientPhone: proposal.telefone ?? "",
      clientEmail: "",
      clientCity: proposal.cidade ?? "",
      clientStatus: CLIENT_STATUS_OPTIONS[0],
      serviceName: proposal.nome_oportunidade ?? "",
      serviceType: proposal.tipo_servico ?? SERVICE_TYPE_OPTIONS[0],
      serviceEntryDate: new Date().toISOString().slice(0, 10),
      serviceCity: proposal.cidade ?? "",
      serviceValue:
        proposal.valor_estimado === null || proposal.valor_estimado === undefined
          ? ""
          : String(proposal.valor_estimado),
      serviceDeadline: getDateInputValue(proposal.proxima_acao_data),
      serviceStatus: "Em andamento",
      serviceOperationalStatus: getSuggestedOperationalStatus("Em andamento"),
      serviceResponsavelId: proposal.responsavel_id ?? defaultResponsibleId,
      serviceNotes: proposal.observacoes ?? "",
    });
    setConversionErrorMessage("");
    setIsConversionModalOpen(true);
  }

  function closeConversionModal() {
    setIsConversionModalOpen(false);
    setConvertingProposal(null);
    setConversionFormData(initialConversionFormData);
    setConversionErrorMessage("");
  }

  function updateField(field: keyof FormData, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function updateConversionField(
    field: keyof ConversionFormData,
    value: string
  ) {
    setConversionFormData((currentData) => {
      if (field === "serviceStatus") {
        return {
          ...currentData,
          serviceStatus: value,
          serviceOperationalStatus: getSuggestedOperationalStatus(value),
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

    const nomeOportunidade = formData.nome_oportunidade.trim();
    const nomeContato = formData.nome_contato.trim();
    const empresa = formData.empresa.trim();
    const telefone = formData.telefone.trim();
    const cidade = formData.cidade.trim();
    const origem = formData.origem.trim();
    const tipoServico = formData.tipo_servico.trim();
    const valorEstimado = formData.valor_estimado.trim();
    const proximaAcaoData = formData.proxima_acao_data.trim();
    const status = formData.status.trim();
    const responsavelId =
      formData.responsavel_id.trim() || defaultResponsibleId || null;
    const motivoPerda = formData.motivo_perda.trim();
    const observacoes = formData.observacoes.trim();

    if (!nomeOportunidade) {
      setErrorMessage("Informe o nome da oportunidade.");
      return;
    }

    if (!status) {
      setErrorMessage("Selecione o status comercial.");
      return;
    }

    let parsedValue: number | null = null;

    if (valorEstimado) {
      parsedValue = Number(valorEstimado.replace(",", "."));

      if (Number.isNaN(parsedValue)) {
        setErrorMessage("Informe um valor estimado valido.");
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const isEditing = modalMode === "edit";

    const payload = withOrganizationId({
      nome_oportunidade: nomeOportunidade,
      nome_contato: nomeContato || null,
      empresa: empresa || null,
      telefone: telefone || null,
      cidade: cidade || null,
      origem: origem || null,
      tipo_servico: tipoServico || null,
      valor_estimado: parsedValue,
      proxima_acao_data: proximaAcaoData || null,
      status,
      responsavel_id: responsavelId,
      motivo_perda: status === "Perdido" ? motivoPerda || null : null,
      observacoes: observacoes || null,
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
    }, currentOrganizationId);

    const response =
      isEditing && editingProposalId !== null
        ? await supabase
            .from("propostas")
            .update(payload)
            .eq("id", editingProposalId)
            .eq("organization_id", currentOrganizationId ?? "")
            .select("id")
            .single()
        : await supabase.from("propostas").insert(payload).select("id").single();

    setIsSaving(false);

    if (response.error) {
      setErrorMessage(
        isEditing
          ? "Não foi possível atualizar a proposta agora. Tente novamente."
          : "Não foi possível salvar a proposta agora. Tente novamente."
      );
      return;
    }

    closeModal();
    setSuccessMessage(
      isEditing
        ? "Proposta atualizada com sucesso."
        : "Proposta salva com sucesso."
    );
    router.refresh();
  }

  async function handleDelete(proposal: PropostaComercial) {
    const shouldDelete = window.confirm("Tem certeza que deseja excluir?");

    if (!shouldDelete) {
      return;
    }

    setDeletingProposalId(proposal.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("propostas")
      .delete()
      .eq("id", proposal.id)
      .eq("organization_id", currentOrganizationId ?? "");

    setDeletingProposalId(null);

    if (error) {
      setErrorMessage("Não foi possível excluir a proposta agora. Tente novamente.");
      return;
    }

    setSuccessMessage("Proposta excluida com sucesso.");
    router.refresh();
  }

  async function handleConvertProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!convertingProposal) {
      return;
    }

    const {
      clientMode,
      existingClientId,
      clientName,
      clientPhone,
      clientEmail,
      clientCity,
      clientStatus,
      serviceName,
      serviceType,
      serviceEntryDate,
      serviceCity,
      serviceValue,
      serviceDeadline,
      serviceStatus,
      serviceOperationalStatus,
      serviceResponsavelId,
      serviceNotes,
    } = conversionFormData;

    const trimmedClientName = clientName.trim();
    const trimmedServiceName = serviceName.trim();
    const trimmedServiceType = serviceType.trim();
    const trimmedServiceStatus = serviceStatus.trim();
    const trimmedServiceOperationalStatus = serviceOperationalStatus.trim();
    const trimmedClientStatus = clientStatus.trim();

    if (clientMode === "existing" && !existingClientId) {
      setConversionErrorMessage("Selecione um cliente para vincular a proposta.");
      return;
    }

    if (clientMode === "new" && !trimmedClientName) {
      setConversionErrorMessage("Informe o nome do cliente que sera criado.");
      return;
    }

    if (!trimmedServiceName) {
      setConversionErrorMessage("Informe o nome do serviço que será criado.");
      return;
    }

    if (!trimmedServiceType) {
      setConversionErrorMessage("Selecione o tipo do serviço.");
      return;
    }

    if (!trimmedServiceStatus) {
      setConversionErrorMessage("Selecione o status inicial do serviço.");
      return;
    }

    if (!trimmedServiceOperationalStatus) {
      setConversionErrorMessage(
        "Selecione a situação operacional inicial do serviço."
      );
      return;
    }

    let parsedServiceValue: number | null = null;

    if (serviceValue.trim()) {
      parsedServiceValue = Number(serviceValue.replace(",", "."));

      if (Number.isNaN(parsedServiceValue)) {
        setConversionErrorMessage("Informe um valor válido para o serviço.");
        return;
      }
    }

    setIsConverting(true);
    setConversionErrorMessage("");
    setErrorMessage("");
    setSuccessMessage("");

    let clienteId: number | null = null;

    if (clientMode === "existing") {
      clienteId = Number(existingClientId);

      if (Number.isNaN(clienteId)) {
        setIsConverting(false);
        setConversionErrorMessage("Cliente selecionado invalido.");
        return;
      }
    } else {
      const clientPayload = withOrganizationId({
        nome: trimmedClientName,
        telefone: clientPhone.trim() || null,
        email: clientEmail.trim() || null,
        cidade: clientCity.trim() || null,
        status: trimmedClientStatus || CLIENT_STATUS_OPTIONS[0],
        criado_por: currentUserId || null,
        atualizado_por: currentUserId || null,
        responsavel_id: currentUserId || null,
      }, currentOrganizationId);

      const clientResponse = await supabase
        .from("clientes")
        .insert(clientPayload)
        .select("id")
        .single();

      if (clientResponse.error || !clientResponse.data?.id) {
        setIsConverting(false);
        setConversionErrorMessage(
          "Não foi possível criar o cliente agora. Tente novamente."
        );
        return;
      }

      clienteId = clientResponse.data.id;
    }

    const servicePayload = withOrganizationId({
      cliente_id: clienteId,
      nome_servico: trimmedServiceName,
      tipo_servico: trimmedServiceType,
      data_entrada: serviceEntryDate.trim() || null,
      cidade: serviceCity.trim() || clientCity.trim() || null,
      valor: parsedServiceValue,
      prazo_final: serviceDeadline.trim() || null,
      observacoes: serviceNotes.trim() || null,
      status: trimmedServiceStatus,
      situacao_operacional: trimmedServiceOperationalStatus,
      criado_por: currentUserId || null,
      atualizado_por: currentUserId || null,
      responsavel_id: serviceResponsavelId.trim() || currentUserId || null,
    }, currentOrganizationId);

    const serviceResponse = await supabase
      .from("servicos")
      .insert(servicePayload)
      .select("id")
      .single();

    if (serviceResponse.error || !serviceResponse.data?.id) {
      setIsConverting(false);
      setConversionErrorMessage(
        "Não foi possível criar o serviço agora. Tente novamente."
      );
      return;
    }

    const serviceId = serviceResponse.data.id;
    const stageTitles = getStageTemplateByServiceType(trimmedServiceType);
    const pendingTemplates = getPendingTemplateByServiceType(trimmedServiceType);

    await supabase.from("servico_etapas").insert(
      stageTitles.map((title, index) => ({
        ...(currentOrganizationId
          ? { organization_id: currentOrganizationId }
          : {}),
        servico_id: serviceId,
        titulo: title,
        ordem: index + 1,
        status: index === 0 ? "Em andamento" : "Pendente",
      }))
    );

    if (pendingTemplates.length > 0) {
      await supabase.from("servico_pendencias").insert(
        pendingTemplates.map((pendingTemplate) => ({
          ...(currentOrganizationId
            ? { organization_id: currentOrganizationId }
            : {}),
          servico_id: serviceId,
          titulo: pendingTemplate.titulo,
          origem: pendingTemplate.origem,
          prioridade: pendingTemplate.prioridade ?? "media",
          status: "Aberta",
          criado_por: currentUserId || null,
          atualizado_por: currentUserId || null,
          responsavel_id:
            serviceResponsavelId.trim() || currentUserId || null,
        }))
      );
    }

    await supabase.from("servico_eventos").insert([
      {
        ...(currentOrganizationId
          ? { organization_id: currentOrganizationId }
          : {}),
        servico_id: serviceId,
        tipo: "sistema",
        titulo: "Serviço criado",
        descricao: `Serviço originado da proposta comercial ${convertingProposal.nome_oportunidade ?? convertingProposal.id}.`,
        criado_por: currentUserId || null,
      },
      {
        ...(currentOrganizationId
          ? { organization_id: currentOrganizationId }
          : {}),
        servico_id: serviceId,
        tipo: "sistema",
        titulo: "Etapas iniciais geradas",
        descricao: `${stageTitles.length} etapas padrão foram criadas automaticamente.`,
        criado_por: currentUserId || null,
      },
      {
        ...(currentOrganizationId
          ? { organization_id: currentOrganizationId }
          : {}),
        servico_id: serviceId,
        tipo: "sistema",
        titulo: "Pendencias iniciais sugeridas",
        descricao: `${pendingTemplates.length} pendência(s) padrão foram criadas automaticamente.`,
        criado_por: currentUserId || null,
      },
    ]);

    const proposalResponse = await supabase
      .from("propostas")
      .update({
        status: "Ganho",
        cliente_id: clienteId,
        servico_id: serviceId,
        convertido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        atualizado_por: currentUserId || null,
        responsavel_id: currentUserId || null,
      })
      .eq("id", convertingProposal.id)
      .eq("organization_id", currentOrganizationId ?? "");

    setIsConverting(false);

    if (proposalResponse.error) {
      setConversionErrorMessage(
        "O cliente e o serviço foram criados, mas não foi possível atualizar a proposta."
      );
      return;
    }

    closeConversionModal();
    setSuccessMessage("Proposta convertida em cliente e serviço com sucesso.");
    router.refresh();
  }

  async function updateProposalStatus(
    proposal: PropostaComercial,
    nextStatus: string
  ) {
    const trimmedStatus = nextStatus.trim();

    if (!trimmedStatus || trimmedStatus === proposal.status) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setProposalList((currentProposals) =>
      currentProposals.map((currentProposal) =>
        currentProposal.id === proposal.id
          ? {
              ...currentProposal,
              status: trimmedStatus,
              convertido_em:
                trimmedStatus === "Ganho"
                  ? currentProposal.convertido_em
                  : null,
              motivo_perda:
                trimmedStatus === "Perdido"
                  ? currentProposal.motivo_perda
                  : null,
            }
          : currentProposal
      )
    );

    const { error } = await supabase
      .from("propostas")
      .update({
        status: trimmedStatus,
        convertido_em: trimmedStatus === "Ganho" ? proposal.convertido_em : null,
        motivo_perda: trimmedStatus === "Perdido" ? proposal.motivo_perda : null,
        updated_at: new Date().toISOString(),
        atualizado_por: currentUserId || null,
      })
      .eq("id", proposal.id)
      .eq("organization_id", currentOrganizationId ?? "");

    if (error) {
      setProposalList((currentProposals) =>
        currentProposals.map((currentProposal) =>
          currentProposal.id === proposal.id
            ? { ...currentProposal, status: proposal.status }
            : currentProposal
        )
      );
      setErrorMessage(
        "Não foi possível atualizar o status da proposta agora. Tente novamente."
      );
      return;
    }

    setSuccessMessage("Status da proposta atualizado com sucesso.");
    router.refresh();
  }

  function handleKanbanMove(proposalId: string, nextColumnId: string) {
    const proposal = proposalList.find(
      (currentProposal) => String(currentProposal.id) === proposalId
    );

    if (!proposal) {
      return;
    }

    updateProposalStatus(proposal, nextColumnId);
  }

  return (
    <>
      <AppShell
        title="Comercial"
        description="Funil comercial com propostas, negociações e histórico de conversão."
        currentPath="/comercial"
        currentUserName={currentUserName}
        currentUserDetail={currentUserDetail}
        currentUserInitials={currentUserInitials}
        action={
          <button
            type="button"
            onClick={openModal}
            className={primaryButtonClassName}
          >
            Nova proposta
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
                placeholder="Buscar por oportunidade, contato, empresa, cidade ou tipo de serviço"
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
                  {COMMERCIAL_STATUS_OPTIONS.map((statusOption) => (
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

            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
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
            totalLabel={`${filteredProposals.length} resultado${
              filteredProposals.length === 1 ? "" : "s"
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
            title="Funil por responsável"
            description="Quem está concentrando mais oportunidades abertas dentro do resultado atual."
            emptyMessage="A distribuição comercial por responsável aparecerá aqui quando houver propostas no resultado atual."
            items={responsibleProposalInsights}
          />
        </section>

        <PageTable>
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#17352b]">
                Visualização do funil
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Altere a forma de leitura do funil atual.
              </p>
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
          {proposalList.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhuma proposta cadastrada
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver registros na tabela de propostas, eles aparecerão aqui.
              </p>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum resultado encontrado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Tente ajustar a busca ou os filtros do funil.
              </p>
            </div>
          ) : viewMode === "kanban" ? (
            <div className="p-4 sm:p-5">
              <KanbanBoard
                columns={kanbanColumns}
                getItemKey={(proposal) => String(proposal.id)}
                onMoveItem={handleKanbanMove}
                renderCard={(proposal) => (
                  <article
                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.26)] ${
                      isFollowUpOverdue(proposal) ? "ring-1 ring-amber-200" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#17352b]">
                          {proposal.nome_oportunidade ?? "-"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {getProposalDisplayName(proposal)}
                        </p>
                        <p className="mt-2 truncate text-xs text-slate-400">
                          Responsável:{" "}
                          {getProposalResponsibleLabel(proposal, userDisplayNames)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClassName(
                          proposal.status
                        )}`}
                      >
                        {proposal.status ?? "-"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span>Tipo</span>
                        <span className="font-medium text-slate-700">
                          {proposal.tipo_servico ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Valor</span>
                        <span className="font-medium text-slate-700">
                          {formatCurrency(proposal.valor_estimado)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Próxima ação</span>
                        <span
                          className={
                            isFollowUpOverdue(proposal)
                              ? "font-medium text-amber-700"
                              : "font-medium text-slate-700"
                          }
                        >
                          {formatSimpleDate(proposal.proxima_acao_data)}
                        </span>
                      </div>
                    </div>

                    {isConvertedProposal(proposal) ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Convertida
                        </span>
                        {proposal.cliente_id ? (
                          <Link
                            href={`/clientes/${proposal.cliente_id}`}
                            className="text-xs font-semibold text-[#17352b] transition hover:text-[#204638]"
                          >
                            Abrir cliente
                          </Link>
                        ) : null}
                        {proposal.servico_id ? (
                          <Link
                            href={`/servicos/${proposal.servico_id}`}
                            className="text-xs font-semibold text-[#17352b] transition hover:text-[#204638]"
                          >
                            Abrir serviço
                          </Link>
                        ) : null}
                      </div>
                    ) : hasConversionHistory(proposal) ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Conversao anterior
                        </span>
                        {proposal.cliente_id ? (
                          <Link
                            href={`/clientes/${proposal.cliente_id}`}
                            className="text-xs font-semibold text-[#17352b] transition hover:text-[#204638]"
                          >
                            Abrir cliente
                          </Link>
                        ) : null}
                        {proposal.servico_id ? (
                          <Link
                            href={`/servicos/${proposal.servico_id}`}
                            className="text-xs font-semibold text-[#17352b] transition hover:text-[#204638]"
                          >
                            Abrir serviço
                          </Link>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between gap-3">
                      {isConvertedProposal(proposal) ? (
                        <span className="text-sm font-medium text-slate-400">
                          Conversao concluida
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openConversionModal(proposal)}
                          className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                        >
                          {hasConversionHistory(proposal) ? "Converter novamente" : "Converter"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(proposal)}
                        className="text-sm font-medium text-slate-500 transition hover:text-[#17352b]"
                      >
                        Editar
                      </button>
                    </div>
                  </article>
                )}
              />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-[980px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Serviço / oportunidade
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cliente / contato
                      </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Tipo de serviço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Valor estimado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Próxima ação
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
                  {filteredProposals.map((proposal) => (
                    <tr
                      key={proposal.id}
                      className={`hover:bg-slate-50/80 ${
                        isFollowUpOverdue(proposal) ? "bg-amber-50/50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <span className="block font-medium text-slate-700">
                          {proposal.nome_oportunidade ?? "-"}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {proposal.empresa ?? "Sem empresa"} •{" "}
                          {proposal.cidade ?? "Sem cidade"}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">
                          Responsável:{" "}
                          {getProposalResponsibleLabel(proposal, userDisplayNames)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <span className="block">{proposal.nome_contato ?? "-"}</span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {proposal.telefone ?? proposal.origem ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {proposal.tipo_servico ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#17352b]">
                        {formatCurrency(proposal.valor_estimado)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm ${
                          isFollowUpOverdue(proposal)
                            ? "font-medium text-amber-700"
                            : "text-slate-500"
                        }`}
                      >
                        {formatSimpleDate(proposal.proxima_acao_data)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap justify-end gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClassName(
                              proposal.status
                            )}`}
                          >
                            {proposal.status ?? "-"}
                          </span>
                          {hasConversionHistory(proposal) ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              Conversao anterior
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <ActionsMenu
                          items={[
                            ...(!isConvertedProposal(proposal)
                              ? [
                                  {
                                    label: hasConversionHistory(proposal)
                                      ? "Converter novamente"
                                      : "Converter em serviço",
                                    onClick: () => openConversionModal(proposal),
                                  },
                                ]
                              : []),
                            ...(proposal.cliente_id
                              ? [
                                  {
                                    label: "Abrir cliente",
                                    href: `/clientes/${proposal.cliente_id}`,
                                  },
                                ]
                              : []),
                            ...(proposal.servico_id
                              ? [
                                  {
                                    label: "Abrir serviço",
                                    href: `/servicos/${proposal.servico_id}`,
                                  },
                                ]
                              : []),
                            {
                              label: "Editar",
                              onClick: () => openEditModal(proposal),
                            },
                            {
                              label:
                                deletingProposalId === proposal.id
                                  ? "Excluindo..."
                                  : "Excluir",
                              onClick: () => handleDelete(proposal),
                              disabled: deletingProposalId === proposal.id,
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
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                {modalMode === "edit" ? "Editar proposta" : "Nova proposta"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modalMode === "edit"
                  ? "Atualize os dados da oportunidade selecionada."
                  : "Registre uma nova oportunidade comercial para acompanhar o funil."}
              </p>
            </div>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Serviço ou oportunidade
                      <input
                        type="text"
                        value={formData.nome_oportunidade}
                        onChange={(event) =>
                          updateField("nome_oportunidade", event.target.value)
                        }
                        placeholder="Ex: Georreferenciamento Fazenda Boa Vista"
                        className={fieldInputClassName}
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Pessoa de contato
                      <input
                        type="text"
                        value={formData.nome_contato}
                        onChange={(event) =>
                          updateField("nome_contato", event.target.value)
                        }
                        placeholder="Nome da pessoa com quem voce fala"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Cliente ou empresa interessada
                      <input
                        type="text"
                        value={formData.empresa}
                        onChange={(event) => updateField("empresa", event.target.value)}
                        placeholder="Empresa, fazenda, proprietario ou interessado"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                      />
                    </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Telefone
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(event) => updateField("telefone", event.target.value)}
                      placeholder="(00) 00000-0000"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Cidade
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(event) => updateField("cidade", event.target.value)}
                      placeholder="Cidade - UF"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Origem
                    <input
                      type="text"
                      value={formData.origem}
                      onChange={(event) => updateField("origem", event.target.value)}
                      placeholder="Indicacao, site, Instagram, retorno..."
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Tipo de serviço
                    <input
                      type="text"
                      value={formData.tipo_servico}
                      onChange={(event) =>
                        updateField("tipo_servico", event.target.value)
                      }
                      placeholder="Topografia, CAR, licenciamento..."
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Valor estimado
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor_estimado}
                      onChange={(event) =>
                        updateField("valor_estimado", event.target.value)
                      }
                      placeholder="0,00"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Próxima ação
                    <input
                      type="date"
                      value={formData.proxima_acao_data}
                      onChange={(event) =>
                        updateField("proxima_acao_data", event.target.value)
                      }
                      className={fieldSelectClassName}
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    >
                      {COMMERCIAL_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
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

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Motivo de perda
                    <input
                      type="text"
                      value={formData.motivo_perda}
                      onChange={(event) =>
                        updateField("motivo_perda", event.target.value)
                      }
                      placeholder="Preencha quando a proposta for perdida"
                      className={fieldTextareaClassName}
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Observações
                    <textarea
                      rows={4}
                      value={formData.observacoes}
                      onChange={(event) =>
                        updateField("observacoes", event.target.value)
                      }
                      placeholder="Anote o contexto da negociação, o escopo e os próximos passos"
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

      {isConversionModalOpen && convertingProposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                Converter proposta em serviço
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Reaproveite os dados da proposta para criar o cliente e iniciar a execução.
              </p>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleConvertProposal}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Proposta selecionada
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#17352b]">
                    {convertingProposal.nome_oportunidade ?? "-"}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-slate-700">
                        Cliente interessado:
                      </span>{" "}
                      {getProposalClientName(convertingProposal) || "-"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Contato comercial:
                      </span>{" "}
                      {getProposalContactName(convertingProposal) || "-"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Tipo:
                      </span>{" "}
                      {convertingProposal.tipo_servico ?? "-"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">
                        Valor estimado:
                      </span>{" "}
                      {formatCurrency(convertingProposal.valor_estimado)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#17352b]">
                        Cliente
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Vincule a um cliente existente ou crie um novo a partir da proposta.
                      </p>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {([
                        { value: "existing", label: "Cliente existente" },
                        { value: "new", label: "Novo cliente" },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateConversionField("clientMode", option.value)
                          }
                          className={`inline-flex rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                            conversionFormData.clientMode === option.value
                              ? "border-[#17352b] bg-[#17352b] text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {conversionFormData.clientMode === "existing" ? (
                        <SearchableSelect
                          label="Cliente a vincular"
                          value={conversionFormData.existingClientId}
                          onChange={(value) =>
                            updateConversionField("existingClientId", value)
                          }
                          options={clients.map((client) => ({
                            value: String(client.id),
                            label: client.nome,
                          }))}
                          emptyOptionLabel="Selecione um cliente"
                          searchPlaceholder="Digite para buscar um cliente"
                          helperText="Use quando a proposta pertence a um cliente ja existente na base."
                          className="sm:col-span-2"
                        />
                      ) : (
                        <>
                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                            Nome do cliente
                            <input
                              type="text"
                              value={conversionFormData.clientName}
                              onChange={(event) =>
                                updateConversionField("clientName", event.target.value)
                              }
                              placeholder="Nome da empresa, fazenda ou interessado"
                              className={fieldInputClassName}
                            />
                            <span className="text-xs font-normal text-slate-500">
                              Este campo usa primeiro o valor de &quot;Cliente ou empresa interessada&quot; da proposta.
                            </span>
                          </label>

                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Telefone principal
                            <input
                              type="text"
                              value={conversionFormData.clientPhone}
                              onChange={(event) =>
                                updateConversionField("clientPhone", event.target.value)
                              }
                              placeholder="(00) 00000-0000"
                              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                            />
                          </label>

                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Email
                            <input
                              type="email"
                              value={conversionFormData.clientEmail}
                              onChange={(event) =>
                                updateConversionField("clientEmail", event.target.value)
                              }
                              placeholder="cliente@empresa.com"
                              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                            />
                          </label>

                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Cidade
                            <input
                              type="text"
                              value={conversionFormData.clientCity}
                              onChange={(event) =>
                                updateConversionField("clientCity", event.target.value)
                              }
                              placeholder="Cidade - UF"
                              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                            />
                          </label>

                          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                            Status do cliente
                            <select
                              value={conversionFormData.clientStatus}
                              onChange={(event) =>
                                updateConversionField("clientStatus", event.target.value)
                              }
                              className={fieldSelectClassName}
                            >
                              {CLIENT_STATUS_OPTIONS.map((statusOption) => (
                                <option key={statusOption} value={statusOption}>
                                  {statusOption}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#17352b]">
                        Serviço inicial
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Confira os dados que vão abrir a execução técnica a partir da venda.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                        Nome do serviço
                        <input
                          type="text"
                          value={conversionFormData.serviceName}
                          onChange={(event) =>
                            updateConversionField("serviceName", event.target.value)
                          }
                          placeholder="Nome do serviço"
                          className={fieldInputClassName}
                        />
                        <span className="text-xs font-normal text-slate-500">
                          Este campo usa o valor de &quot;Serviço ou oportunidade&quot; da proposta.
                        </span>
                      </label>

                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Tipo de serviço
                        <select
                          value={conversionFormData.serviceType}
                          onChange={(event) =>
                            updateConversionField("serviceType", event.target.value)
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
                        Status inicial
                        <select
                          value={conversionFormData.serviceStatus}
                          onChange={(event) =>
                            updateConversionField("serviceStatus", event.target.value)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                        >
                          {SERVICE_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Situação operacional inicial
                        <select
                          value={conversionFormData.serviceOperationalStatus}
                          onChange={(event) =>
                            updateConversionField(
                              "serviceOperationalStatus",
                              event.target.value
                            )
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
                        Responsável inicial
                        <select
                          value={conversionFormData.serviceResponsavelId}
                          onChange={(event) =>
                            updateConversionField(
                              "serviceResponsavelId",
                              event.target.value
                            )
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
                          value={conversionFormData.serviceEntryDate}
                          onChange={(event) =>
                            updateConversionField("serviceEntryDate", event.target.value)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Cidade
                        <input
                          type="text"
                          value={conversionFormData.serviceCity}
                          onChange={(event) =>
                            updateConversionField("serviceCity", event.target.value)
                          }
                          placeholder="Cidade - UF"
                          className={fieldTextareaClassName}
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Valor contratado
                        <input
                          type="number"
                          step="0.01"
                          value={conversionFormData.serviceValue}
                          onChange={(event) =>
                            updateConversionField("serviceValue", event.target.value)
                          }
                          placeholder="0,00"
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                        Prazo de entrega
                        <input
                          type="date"
                          value={conversionFormData.serviceDeadline}
                          onChange={(event) =>
                            updateConversionField("serviceDeadline", event.target.value)
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                        />
                      </label>

                      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                        Observações iniciais
                        <textarea
                          rows={4}
                          value={conversionFormData.serviceNotes}
                          onChange={(event) =>
                            updateConversionField("serviceNotes", event.target.value)
                          }
                          placeholder="Contexto da venda, escopo e próximos passos"
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                        />
                      </label>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <h4 className="text-sm font-semibold text-[#17352b]">
                          Resumo da conversão
                        </h4>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                              Cliente de destino
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              {conversionFormData.clientMode === "existing"
                                ? selectedExistingClientName
                                : conversionFormData.clientName.trim() || "Novo cliente a criar"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                              Responsável inicial
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              {conversionResponsibleLabel}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                              Etapas geradas
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              {conversionStagePreview.length} etapa(s) padrão para {conversionFormData.serviceType}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                              Pendências sugeridas
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-700">
                              {conversionPendingPreview.length} pendência(s) inicial(is) para abertura do fluxo
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          A conversão mantém a proposta vinculada ao cliente e ao serviço gerado, além de registrar o histórico inicial na timeline.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                {conversionErrorMessage ? (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {conversionErrorMessage}
                  </div>
                ) : null}

                {convertingProposal && hasConversionHistory(convertingProposal) ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Esta proposta já possui histórico de conversão anterior. Revise cliente, serviço e responsável antes de gerar uma nova abertura operacional.
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-5">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeConversionModal}
                    disabled={isConverting}
                    className={secondaryButtonClassName}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isConverting}
                    className={primaryButtonClassName}
                  >
                    {isConverting ? "Convertendo..." : "Converter proposta"}
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
