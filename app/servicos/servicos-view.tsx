"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { ActionsMenu } from "../components/actions-menu";
import { SearchableSelect } from "../components/searchable-select";
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
import { SERVICE_STATUS_OPTIONS } from "./status-options";
import type { ClienteOption, Servico, ServicoFinanceiro } from "./types";

type ServicosViewProps = {
  services: Servico[];
  clients: ClienteOption[];
  financialEntries: ServicoFinanceiro[];
};

type ModalMode = "create" | "edit";

type FormData = {
  cliente_id: string;
  nome_servico: string;
  cidade: string;
  valor: string;
  prazo_final: string;
  observacoes: string;
  status: string;
};

const initialFormData: FormData = {
  cliente_id: "",
  nome_servico: "",
  cidade: "",
  valor: "",
  prazo_final: "",
  observacoes: "",
  status: SERVICE_STATUS_OPTIONS[0],
};

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

export function ServicosView({
  services,
  clients,
  financialEntries,
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
  const [statusFilter, setStatusFilter] = useState("");
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

  const normalizedSearchTerm = normalizeText(searchTerm);
  const filteredServices = serviceList.filter((service) => {
    const matchesStatus = !statusFilter || service.status === statusFilter;

    if (!matchesStatus) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableFields = [
      getClientName(service),
      service.nome_servico,
      service.cidade,
      service.status,
    ];

    return searchableFields.some((field) =>
      normalizeText(field).includes(normalizedSearchTerm)
    );
  });
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
  const unPaidServiceBalances = serviceBalances.filter(
    (summary) => summary.totalRecebido < summary.valorContratado
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
    setFormData(initialFormData);
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

    if (!status) {
      setErrorMessage("Selecione o status do serviço.");
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
      cidade: cidade || null,
      valor: parsedValor,
      prazo_final: prazoFinal || null,
      observacoes: observacoes || null,
      status,
      ...(isEditing ? { updated_at: new Date().toISOString() } : {}),
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

  return (
    <>
      <AppShell
        title="Serviços"
        description="Lista de serviços sincronizada com os dados reais do Supabase."
        currentPath="/servicos"
        action={
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
          >
            Novo serviço
          </button>
        }
      >
        <div className="mb-5">
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
            Busca
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente, serviço, cidade ou status"
              className="min-h-11 w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-700 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)] outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 sm:text-sm"
            />
          </label>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.35)]">
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 sm:text-sm"
              >
                <option value="">Todos os status</option>
                {SERVICE_STATUS_OPTIONS.filter(
                  (statusOption) => statusOption !== "Entregue"
                ).map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
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
              <table className="min-w-[820px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Serviço
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cliente
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
                        <Link
                          href={`/servicos/${summary.service.id}`}
                          className="font-medium text-[#17352b] transition hover:text-[#204638]"
                        >
                          {summary.service.nome_servico ?? "-"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {getClientName(summary.service)}
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
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
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
                Tente selecionar outro status para filtrar a lista.
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
                      Cidade
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Valor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Prazo
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
                          isPastDue(service) ? "bg-rose-50/70" : ""
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
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {service.cidade ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatCurrency(service.valor)}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm ${
                            isPastDue(service)
                              ? "font-medium text-rose-700"
                              : "text-slate-500"
                          }`}
                        >
                          {formatSimpleDate(service.prazo_final)}
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
                              className={`min-h-10 w-full rounded-xl px-3 py-2 text-sm font-medium outline-none transition focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70 ${getStatusClassName(
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
        </section>
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
                  Valor
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(event) => updateField("valor", event.target.value)}
                    placeholder="0,00"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Prazo
                  <input
                    type="date"
                    value={formData.prazo_final}
                    onChange={(event) =>
                      updateField("prazo_final", event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
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
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  />
                </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
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
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
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
