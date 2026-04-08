"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { ActionsMenu } from "../components/actions-menu";
import { supabase } from "../../lib/supabase";
import { CLIENT_STATUS_OPTIONS } from "./status-options";
import type {
  Cliente,
  ClientePortfolioFinanceiro,
  ClientePortfolioServico,
} from "./types";

type ClientesViewProps = {
  clients: Cliente[];
  services: ClientePortfolioServico[];
  financialEntries: ClientePortfolioFinanceiro[];
};

type ModalMode = "create" | "edit";
type PortfolioFilter = "all" | "inProgress" | "openBalance";

type FormData = {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  status: string;
};

const initialFormData: FormData = {
  nome: "",
  telefone: "",
  email: "",
  cidade: "",
  status: CLIENT_STATUS_OPTIONS[0],
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

function isReceivedRevenue(entry: ClientePortfolioFinanceiro) {
  return (
    normalizeText(entry.tipo) === "receita" &&
    normalizeText(entry.status) === "recebido"
  );
}

function isServiceInProgress(service: ClientePortfolioServico) {
  return normalizeText(service.status) === "em andamento";
}

function getStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "ativo") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "em analise") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "inativo") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-sky-50 text-sky-700";
}

export function ClientesView({
  clients,
  services,
  financialEntries,
}: ClientesViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [portfolioFilter, setPortfolioFilter] =
    useState<PortfolioFilter>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);
  const servicesByClientId = new Map<string, ClientePortfolioServico[]>();
  const receivedByServiceId = new Map<string, number>();

  services.forEach((service) => {
    if (service.cliente_id === null || service.cliente_id === undefined) {
      return;
    }

    const clientId = String(service.cliente_id);
    const clientServices = servicesByClientId.get(clientId) ?? [];

    clientServices.push(service);
    servicesByClientId.set(clientId, clientServices);
  });

  financialEntries.filter(isReceivedRevenue).forEach((entry) => {
    if (entry.servico_id === null || entry.servico_id === undefined) {
      return;
    }

    const serviceId = String(entry.servico_id);
    const currentTotal = receivedByServiceId.get(serviceId) ?? 0;

    receivedByServiceId.set(
      serviceId,
      currentTotal + getNumericValue(entry.valor)
    );
  });

  const clientMetrics = new Map<
    number,
    {
      servicesCount: number;
      totalContratado: number;
      totalRecebido: number;
      valorEmAberto: number;
      inProgressServicesCount: number;
      hasServiceInProgress: boolean;
    }
  >();

  clients.forEach((client) => {
    const clientServices = servicesByClientId.get(String(client.id)) ?? [];
    const totalContratado = clientServices.reduce(
      (total, service) => total + getNumericValue(service.valor),
      0
    );
    const totalRecebido = clientServices.reduce((total, service) => {
      const receivedValue = receivedByServiceId.get(String(service.id)) ?? 0;

      return total + receivedValue;
    }, 0);

    clientMetrics.set(client.id, {
      servicesCount: clientServices.length,
      totalContratado,
      totalRecebido,
      valorEmAberto: totalContratado - totalRecebido,
      inProgressServicesCount: clientServices.filter(isServiceInProgress).length,
      hasServiceInProgress: clientServices.some(isServiceInProgress),
    });
  });

  const portfolioCards = [
    {
      title: "Total de clientes",
      value: String(clients.length),
      detail: "Clientes cadastrados na base.",
      filter: "all" as PortfolioFilter,
    },
    {
      title: "Clientes com serviços em andamento",
      value: String(
        Array.from(clientMetrics.values()).filter(
          (metrics) => metrics.hasServiceInProgress
        ).length
      ),
      detail: "Clientes com ao menos um serviço ativo.",
      filter: "inProgress" as PortfolioFilter,
    },
    {
      title: "Clientes com valores em aberto",
      value: String(
        Array.from(clientMetrics.values()).filter(
          (metrics) => metrics.totalRecebido < metrics.totalContratado
        ).length
      ),
      detail: "Clientes com saldo a receber.",
      filter: "openBalance" as PortfolioFilter,
    },
  ];
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredClients = clients.filter((client) => {
    const metrics = clientMetrics.get(client.id);

    if (portfolioFilter === "inProgress" && !metrics?.hasServiceInProgress) {
      return false;
    }

    if (
      portfolioFilter === "openBalance" &&
      (metrics?.valorEmAberto ?? 0) <= 0
    ) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableFields = [
      client.nome,
      client.email,
      client.telefone,
      client.cidade,
    ];

    return searchableFields.some((field) =>
      field?.toLowerCase().includes(normalizedSearchTerm)
    );
  });

  function openModal() {
    setModalMode("create");
    setEditingClientId(null);
    setFormData(initialFormData);
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(client: Cliente) {
    setModalMode("edit");
    setEditingClientId(client.id);
    setFormData({
      nome: client.nome,
      telefone: client.telefone ?? "",
      email: client.email ?? "",
      cidade: client.cidade ?? "",
      status: client.status ?? CLIENT_STATUS_OPTIONS[0],
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalMode("create");
    setEditingClientId(null);
    setErrorMessage("");
    setFormData(initialFormData);
  }

  function applyPortfolioFilter(filter: PortfolioFilter) {
    setPortfolioFilter(filter);

    if (filter === "all") {
      setSearchTerm("");
    }
  }

  function updateField(field: keyof FormData, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nome = formData.nome.trim();
    const telefone = formData.telefone.trim();
    const email = formData.email.trim();
    const cidade = formData.cidade.trim();
    const status = formData.status.trim();

    if (!nome) {
      setErrorMessage("Informe o nome do cliente.");
      return;
    }

    if (!status) {
      setErrorMessage("Selecione o status do cliente.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const isEditing = modalMode === "edit";
    const clientId = editingClientId;

    const clientPayload = {
      nome,
      telefone: telefone || null,
      email: email || null,
      cidade: cidade || null,
      status,
      ...(isEditing ? { updated_at: new Date().toISOString() } : {}),
    };

    const response =
      isEditing && clientId !== null
        ? await supabase
            .from("clientes")
            .update(clientPayload)
            .eq("id", clientId)
            .select("id")
            .single()
        : await supabase
            .from("clientes")
            .insert(clientPayload)
            .select("id")
            .single();

    setIsSaving(false);

    if (response.error) {
      setErrorMessage(
        isEditing
          ? "Não foi possível atualizar o cliente agora. Tente novamente."
          : "Não foi possível salvar o cliente agora. Tente novamente."
      );
      return;
    }

    if (isEditing && !response.data?.id) {
      setErrorMessage("Não foi possível identificar o cliente atualizado.");
      return;
    }

    closeModal();
    setSuccessMessage(
      isEditing
        ? "Cliente atualizado com sucesso."
        : "Cliente salvo com sucesso."
    );
    router.refresh();
  }

  async function handleDelete(client: Cliente) {
    const shouldDelete = window.confirm("Tem certeza que deseja excluir?");

    if (!shouldDelete) {
      return;
    }

    setDeletingClientId(client.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { count: linkedServicesCount, error: linkedServicesError } = await supabase
      .from("servicos")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", client.id);

    if (linkedServicesError) {
      setDeletingClientId(null);
      setErrorMessage(
        "Não foi possível verificar os serviços vinculados a este cliente."
      );
      return;
    }

    if ((linkedServicesCount ?? 0) > 0) {
      setDeletingClientId(null);
      setErrorMessage(
        "Não é possível excluir este cliente porque ele possui serviços vinculados."
      );
      return;
    }

    const { error } = await supabase.from("clientes").delete().eq("id", client.id);

    setDeletingClientId(null);

    if (error) {
      setErrorMessage("Não foi possível excluir o cliente agora. Tente novamente.");
      return;
    }

    setSuccessMessage("Cliente excluído com sucesso.");
    router.refresh();
  }

  return (
    <>
      <AppShell
        title="Clientes"
        description="Lista de clientes sincronizada com os dados reais do Supabase."
        currentPath="/clientes"
        action={
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
          >
            Novo cliente
          </button>
        }
      >
        {successMessage ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.35)]">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.1fr)_minmax(0,2fr)] xl:items-end">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Busca
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, email, telefone ou cidade"
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 sm:text-sm"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              {portfolioCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => applyPortfolioFilter(card.filter)}
                  aria-pressed={portfolioFilter === card.filter}
                  className={`min-h-11 rounded-xl border px-4 py-3 text-left transition hover:border-[#17352b]/40 ${
                    portfolioFilter === card.filter
                      ? "border-[#17352b] bg-emerald-50/70"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <span className="block truncate text-xs font-medium text-slate-500">
                    {card.title}
                  </span>
                  <span className="mt-1 flex items-end justify-between gap-3">
                    <strong className="text-xl font-semibold text-[#17352b]">
                      {card.value}
                    </strong>
                    <span className="hidden truncate text-xs text-slate-400 sm:block">
                      {card.detail}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          {clients.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum cliente cadastrado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver registros na tabela clientes, eles aparecerao aqui.
              </p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum cliente encontrado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Tente buscar por outro nome, email, telefone ou cidade.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-[22%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Nome
                    </th>
                    <th className="w-[13%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Telefone
                    </th>
                    <th className="w-[15%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cidade
                    </th>
                    <th className="w-[9%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Serviços
                    </th>
                    <th className="w-[14%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Em aberto
                    </th>
                    <th className="w-[10%] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                    <th className="w-[17%] px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => {
                    const metrics = clientMetrics.get(client.id);
                    const detailsPath = `/clientes/${client.id}`;

                    return (
                      <tr
                        key={client.id}
                        onClick={() => router.push(detailsPath)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(detailsPath);
                          }
                        }}
                        role="link"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#17352b]/20"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-slate-700">
                          <span className="block truncate" title={client.nome}>
                            {client.nome}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          <span
                            className="block truncate"
                            title={client.telefone ?? undefined}
                          >
                            {client.telefone ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          <span
                            className="block truncate"
                            title={client.cidade ?? undefined}
                          >
                            {client.cidade ?? "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          <span className="block font-medium text-slate-700">
                            {metrics?.servicesCount ?? 0} total
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-400">
                            {metrics?.inProgressServicesCount ?? 0} em andamento
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-[#17352b]">
                          {formatCurrency(metrics?.valorEmAberto ?? 0)}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span
                            className={`inline-flex max-w-full truncate rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                              client.status
                            )}`}
                            title={client.status ?? undefined}
                          >
                            {client.status ?? "Sem status"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-sm">
                          <ActionsMenu
                            items={[
                              {
                                label: "Detalhes",
                                href: detailsPath,
                              },
                              {
                                label: "Editar",
                                onClick: () => openEditModal(client),
                              },
                              {
                                label:
                                  deletingClientId === client.id
                                    ? "Excluindo..."
                                    : "Excluir",
                                onClick: () => handleDelete(client),
                                disabled: deletingClientId === client.id,
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
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-[#17352b]">
                {modalMode === "edit" ? "Editar cliente" : "Novo cliente"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {modalMode === "edit"
                  ? "Atualize os dados do cliente selecionado."
                  : "Preencha os campos abaixo para cadastrar um novo cliente."}
              </p>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleSubmit}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Nome
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(event) => updateField("nome", event.target.value)}
                    placeholder="Digite o nome do cliente"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Telefone
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(event) =>
                      updateField("telefone", event.target.value)
                    }
                    placeholder="(00) 00000-0000"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="cliente@empresa.com"
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
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                    >
                      {CLIENT_STATUS_OPTIONS.map((statusOption) => (
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
    </>
  );
}
