"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/app-shell";
import { SearchableSelect } from "../components/searchable-select";
import { formatSimpleDate, getDateInputValue } from "../../lib/date-utils";
import { supabase } from "../../lib/supabase";
import { getCategoryOptionsByType } from "./category-options";
import type { LancamentoFinanceiro, ServicoOption } from "./types";

type FinanceiroViewProps = {
  entries: LancamentoFinanceiro[];
  services: ServicoOption[];
};

type ModalMode = "create" | "edit";

type FormData = {
  tipo: string;
  categoria: string;
  descricao: string;
  valor: string;
  data: string;
  servico_id: string;
  status: string;
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

const financialDateLabel = "Data financeira";

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
    return service.cliente[0]?.nome ?? "Cliente nao encontrado";
  }

  return service.cliente?.nome ?? "Cliente nao encontrado";
}

function buildSummaryCards(
  entries: LancamentoFinanceiro[],
  services: ServicoOption[]
) {
  const totalContratado = services.reduce(
    (total, service) => total + getNumericValue(service.valor),
    0
  );

  const receitasRecebidas = entries
    .filter(
      (entry) =>
        normalizeText(entry.tipo) === "receita" &&
        normalizeText(entry.status) === "recebido"
    )
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const totalAReceber = totalContratado - receitasRecebidas;

  const despesasPagas = entries
    .filter(
      (entry) =>
        normalizeText(entry.tipo) === "despesa" &&
        normalizeText(entry.status) === "pago"
    )
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const despesaTotal = entries
    .filter((entry) => normalizeText(entry.tipo) === "despesa")
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const despesasVinculadas = entries
    .filter(
      (entry) =>
        normalizeText(entry.tipo) === "despesa" &&
        entry.servico_id !== null &&
        entry.servico_id !== undefined
    )
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const contasVencidas = entries.filter(
    (entry) => normalizeText(entry.status) === "vencido"
  ).length;

  const lucroLiquidoRealizado = receitasRecebidas - despesasPagas;
  const lucroPrevistoGeral = totalContratado - despesasVinculadas;

  return [
    {
      title: "Total a receber",
      value: formatCurrency(totalAReceber),
      detail: "Valor contratado menos receitas recebidas",
    },
    {
      title: "Total recebido",
      value: formatCurrency(receitasRecebidas),
      detail: `${entries.filter((entry) => normalizeText(entry.tipo) === "receita" && normalizeText(entry.status) === "recebido").length} lancamentos recebidos`,
    },
    {
      title: "Lucro líquido realizado",
      value: formatCurrency(lucroLiquidoRealizado),
      detail: "Receitas recebidas menos despesas pagas",
    },
    {
      title: "Lucro previsto geral",
      value: formatCurrency(lucroPrevistoGeral),
      detail: "Valor contratado menos despesas vinculadas",
    },
    {
      title: "Contas vencidas",
      value: String(contasVencidas),
      detail: 'Lancamentos com status "Vencido"',
    },
    {
      title: "Despesas cadastradas",
      value: formatCurrency(despesaTotal),
      detail: `${entries.filter((entry) => normalizeText(entry.tipo) === "despesa").length} lancamentos de despesa`,
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

export function FinanceiroView({
  entries,
  services,
}: FinanceiroViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
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
        serviceName: service.nome_servico ?? `Servico ${service.id}`,
      },
    ])
  );

  const summaryCards = buildSummaryCards(entries, services);
  const categoryOptions = getCategoryOptionsByType(formData.tipo);
  const statusOptions = getStatusOptionsByType(formData.tipo);
  const serviceFallbackLabel = "Despesa geral da empresa";
  const selectedService = formData.servico_id
    ? serviceById.get(formData.servico_id)
    : null;
  const normalizedSearchTerm = normalizeText(searchTerm);
  const filteredEntries = entries.filter((entry) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableFields = [
      entry.descricao,
      entry.tipo,
      entry.status,
      financialDateLabel,
      serviceDetailsById.get(String(entry.servico_id))?.serviceName ??
        serviceFallbackLabel,
      serviceDetailsById.get(String(entry.servico_id))?.clientName,
    ];

    return searchableFields.some((field) =>
      normalizeText(field).includes(normalizedSearchTerm)
    );
  });

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
      setErrorMessage("Selecione o tipo do lancamento.");
      return;
    }

    if (!descricao) {
      setErrorMessage("Informe a descricao do lancamento.");
      return;
    }

    if (!categoria) {
      setErrorMessage("Selecione a categoria do lancamento.");
      return;
    }

    if (!valor) {
      setErrorMessage("Informe o valor do lancamento.");
      return;
    }

    if (!data) {
      setErrorMessage("Informe a data do lancamento.");
      return;
    }

    if (!status) {
      setErrorMessage("Selecione o status do lancamento.");
      return;
    }

    if (!getStatusOptionsByType(tipo).includes(status)) {
      setErrorMessage("Selecione um status compativel com o tipo do lancamento.");
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
      setErrorMessage("Servico invalido.");
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
      ...(isEditing ? { updated_at: new Date().toISOString() } : {}),
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
          ? "Nao foi possivel atualizar o lancamento agora. Tente novamente."
          : "Nao foi possivel salvar o lancamento agora. Tente novamente."
      );
      return;
    }

    if (isEditing && !response.data?.id) {
      setErrorMessage("Nao foi possivel identificar o lancamento atualizado.");
      return;
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

    const { error } = await supabase
      .from("financeiro")
      .delete()
      .eq("id", entry.id);

    setDeletingEntryId(null);

    if (error) {
      setErrorMessage(
        "Nao foi possivel excluir o lancamento agora. Tente novamente."
      );
      return;
    }

    router.refresh();
  }

  return (
    <>
      <AppShell
        title="Financeiro"
        description="Lancamentos reais sincronizados com a tabela financeiro do Supabase."
        currentPath="/financeiro"
        action={
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
          >
            Novo lançamento
          </button>
        }
      >
        <div className="space-y-6">
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por descricao, tipo, status, servico ou cliente"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.2)] outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
            />
          </div>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]"
              >
                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>
                <strong className="mt-4 block text-3xl font-semibold text-[#17352b]">
                  {card.value}
                </strong>
                <p className="mt-3 text-sm text-slate-500">{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
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
            ) : filteredEntries.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-[#17352b]">
                  Nenhum resultado encontrado
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Tente buscar por outro termo para filtrar os lançamentos.
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
                        Categoria
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Descrição
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Valor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {financialDateLabel}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Servico e cliente
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
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80">
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {entry.tipo ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {entry.categoria ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {entry.descricao ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatCurrency(entry.valor)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          <span className="block font-medium text-slate-700">
                            {formatSimpleDate(entry.data)}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400">
                            {financialDateLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          <span className="block font-medium text-slate-700">
                            {serviceDetailsById.get(String(entry.servico_id))
                              ?.serviceName ?? serviceFallbackLabel}
                          </span>
                          {serviceDetailsById.get(String(entry.servico_id))
                            ?.clientName ? (
                            <span className="mt-1 block text-xs text-slate-400">
                              Cliente:{" "}
                              {
                                serviceDetailsById.get(String(entry.servico_id))
                                  ?.clientName
                              }
                            </span>
                          ) : null}
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
                        <td className="px-6 py-4 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry)}
                              disabled={deletingEntryId === entry.id}
                              className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingEntryId === entry.id
                                ? "Excluindo..."
                                : "Excluir"}
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
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  >
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                  </select>
                </label>

                <SearchableSelect
                  label="Servico vinculado opcional"
                  value={formData.servico_id}
                  onChange={(value) => updateField("servico_id", value)}
                  options={services.map((service) => {
                    const serviceName =
                      service.nome_servico ?? `Servico ${service.id}`;
                    const clientName = getServiceClientName(service);

                    return {
                      value: String(service.id),
                      label: `${serviceName} - ${clientName}`,
                      searchText: `${serviceName} ${clientName}`,
                    };
                  })}
                  emptyOptionLabel={serviceFallbackLabel}
                  searchPlaceholder="Digite para buscar servico ou cliente"
                  helperText={
                    selectedService
                      ? `Cliente relacionado: ${getServiceClientName(
                          selectedService
                        )}`
                      : "Use esta opcao para despesas sem servico vinculado."
                  }
                />

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Categoria
                  <select
                    value={formData.categoria}
                    onChange={(event) =>
                      updateField("categoria", event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  >
                    {categoryOptions.map((categoryOption) => (
                      <option key={categoryOption} value={categoryOption}>
                        {categoryOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  Descricao
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(event) =>
                      updateField("descricao", event.target.value)
                    }
                    placeholder="Digite a descrição do lançamento"
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
                  {financialDateLabel}
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(event) => updateField("data", event.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    Para parcelas, cadastre cada data como um lancamento separado.
                  </span>
                </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
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
