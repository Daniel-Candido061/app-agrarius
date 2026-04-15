import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { SummaryCard, SummaryCardsGrid } from "../../components/summary-card";
import { formatSimpleDate, isBeforeTodayDateOnly } from "../../../lib/date-utils";
import { requireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import type {
  Cliente,
  ClienteFinanceiro,
  ClientePendencia,
  ClienteProposta,
  ClienteServico,
} from "../types";

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

function isRevenue(entry: ClienteFinanceiro) {
  return normalizeText(entry.tipo) === "receita";
}

function isExpense(entry: ClienteFinanceiro) {
  return normalizeText(entry.tipo) === "despesa";
}

function isReceived(entry: ClienteFinanceiro) {
  return normalizeText(entry.status) === "recebido";
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

function getServiceStatusClassName(status: string | null) {
  const normalizedStatus = normalizeText(status);

  if (normalizedStatus === "proposta") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "em andamento") {
    return "bg-sky-50 text-sky-700";
  }

  if (normalizedStatus === "protocolado") {
    return "bg-violet-50 text-violet-700";
  }

  if (normalizedStatus === "entregue") {
    return "bg-teal-50 text-teal-700";
  }

  if (normalizedStatus === "concluido") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "cancelado") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

async function getCliente(id: number) {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, telefone, email, cidade, status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar cliente:", error.message);
    return null;
  }

  return (data ?? null) as Cliente | null;
}

async function getServicosDoCliente(id: number) {
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome_servico, cidade, valor, prazo_final, status")
    .eq("cliente_id", id)
    .order("prazo_final", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar servicos do cliente:", error.message);
    return [];
  }

  return (data ?? []) as ClienteServico[];
}

async function getLancamentosDosServicos(serviceIds: number[]) {
  if (serviceIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("financeiro")
    .select("id, tipo, valor, servico_id, status")
    .in("servico_id", serviceIds);

  if (error) {
    console.error(
      "Erro ao buscar financeiro dos servicos do cliente:",
      error.message
    );
    return [];
  }

  return (data ?? []) as ClienteFinanceiro[];
}

async function getPropostasDoCliente(id: number) {
  const { data, error } = await supabase
    .from("propostas")
    .select("id, nome_oportunidade, status, valor_estimado, convertido_em, servico_id")
    .eq("cliente_id", id)
    .order("convertido_em", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar propostas do cliente:", error.message);
    return [];
  }

  return (data ?? []) as ClienteProposta[];
}

async function getPendenciasDosServicos(serviceIds: number[]) {
  if (serviceIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("servico_pendencias")
    .select("id, servico_id, titulo, origem, prioridade, prazo_resposta, status")
    .in("servico_id", serviceIds)
    .order("prazo_resposta", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Erro ao buscar pendencias dos servicos do cliente:",
      error.message
    );
    return [];
  }

  return (data ?? []) as ClientePendencia[];
}

export default async function ClienteDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireAuth();

  const { id } = await params;
  const clientId = Number(id);

  if (Number.isNaN(clientId)) {
    notFound();
  }

  const [client, services, proposals] = await Promise.all([
    getCliente(clientId),
    getServicosDoCliente(clientId),
    getPropostasDoCliente(clientId),
  ]);

  if (!client) {
    notFound();
  }

  const serviceIds = services.map((service) => service.id);
  const [financialEntries, pendings] = await Promise.all([
    getLancamentosDosServicos(serviceIds),
    getPendenciasDosServicos(serviceIds),
  ]);

  const entriesByServiceId = new Map<string, ClienteFinanceiro[]>();

  financialEntries.forEach((entry) => {
    if (entry.servico_id === null || entry.servico_id === undefined) {
      return;
    }

    const serviceId = String(entry.servico_id);
    const entries = entriesByServiceId.get(serviceId) ?? [];

    entries.push(entry);
    entriesByServiceId.set(serviceId, entries);
  });

  const totalContratado = services.reduce(
    (total, service) => total + getNumericValue(service.valor),
    0
  );

  const totalRecebido = financialEntries
    .filter((entry) => isRevenue(entry) && isReceived(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const totalEmAberto = totalContratado - totalRecebido;
  const servicosEmAndamento = services.filter(
    (service) => normalizeText(service.status) === "em andamento"
  ).length;
  const servicosConcluidos = services.filter(
    (service) => normalizeText(service.status) === "concluido"
  ).length;
  const openPendings = pendings.filter(
    (pending) => normalizeText(pending.status) !== "resolvida"
  );
  const overduePendings = openPendings.filter(
    (pending) => pending.prazo_resposta && isBeforeTodayDateOnly(pending.prazo_resposta)
  );

  const serviceSummaries = services.map((service) => {
    const serviceEntries = entriesByServiceId.get(String(service.id)) ?? [];
    const valorContratado = getNumericValue(service.valor);
    const recebido = serviceEntries
      .filter((entry) => isRevenue(entry) && isReceived(entry))
      .reduce((total, entry) => total + getNumericValue(entry.valor), 0);
    const despesasVinculadas = serviceEntries
      .filter(isExpense)
      .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

    return {
      service,
      valorContratado,
      recebido,
      emAberto: valorContratado - recebido,
      despesasVinculadas,
      lucroLiquidoPrevisto: valorContratado - despesasVinculadas,
    };
  });

  const summaryCards = [
    {
      title: "Total de servicos",
      value: String(services.length),
      detail: "Servicos vinculados a este cliente.",
      tone: "neutral" as const,
    },
    {
      title: "Em andamento",
      value: String(servicosEmAndamento),
      detail: "Servicos ativos na operacao.",
      tone: "success" as const,
    },
    {
      title: "Concluidos",
      value: String(servicosConcluidos),
      detail: "Servicos finalizados do cliente.",
      tone: "info" as const,
    },
    {
      title: "Pendencias abertas",
      value: String(openPendings.length),
      detail:
        overduePendings.length > 0
          ? `${overduePendings.length} pendencia(s) estao atrasadas.`
          : "Itens aguardando retorno na carteira deste cliente.",
      tone: overduePendings.length > 0 ? ("danger" as const) : ("warning" as const),
    },
  ];

  const financialSummaryCards = [
    {
      title: "Total contratado",
      value: formatCurrency(totalContratado),
      detail: "Soma dos valores contratados nos servicos.",
    },
    {
      title: "Total recebido",
      value: formatCurrency(totalRecebido),
      detail: "Receitas recebidas dos servicos do cliente.",
    },
    {
      title: "Valor em aberto",
      value: formatCurrency(totalEmAberto),
      detail: "Total contratado menos total recebido.",
    },
  ];

  return (
    <AppShell
      title="Detalhes do cliente"
      description="Resumo do cliente, da carteira ativa e do historico comercial vinculado."
      currentPath="/clientes"
      action={
        <Link
          href="/clientes"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Voltar
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Cliente</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#17352b]">
                  {client.nome}
                </h2>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                  client.status
                )}`}
              >
                {client.status ?? "Sem status"}
              </span>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Telefone
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {client.telefone ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Email
                </p>
                <p className="mt-2 text-sm text-slate-600">{client.email ?? "-"}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Cidade
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {client.cidade ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Propostas convertidas
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {proposals.length}
                </p>
              </div>
            </div>
          </article>

          <SummaryCardsGrid className="md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                tone={card.tone}
                compact
              />
            ))}
          </SummaryCardsGrid>
        </section>

        <section>
          <SummaryCardsGrid className="md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
            {financialSummaryCards.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                tone={
                  card.title === "Total recebido"
                    ? "success"
                    : card.title === "Valor em aberto"
                      ? "warning"
                      : "neutral"
                }
                valueClassName="text-[#163728] text-[1.9rem] sm:text-[2.1rem]"
                compact
              />
            ))}
          </SummaryCardsGrid>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-lg font-semibold text-[#17352b]">
                Propostas convertidas
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Historico comercial que originou servicos para este cliente.
              </p>
            </div>

            {proposals.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Nenhuma proposta vinculada a este cliente.
              </div>
            ) : (
              <div className="space-y-3 p-6">
                {proposals.map((proposal) => (
                  <article
                    key={proposal.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-[#17352b]">
                          {proposal.nome_oportunidade ?? "-"}
                        </h4>
                        <p className="mt-2 text-sm text-slate-500">
                          Valor estimado: {formatCurrency(proposal.valor_estimado)}
                        </p>
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {proposal.status ?? "Sem status"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {proposal.convertido_em
                            ? `Convertida em ${formatSimpleDate(proposal.convertido_em)}`
                            : "Sem data de conversao"}
                        </span>
                        {proposal.servico_id ? (
                          <Link
                            href={`/servicos/${proposal.servico_id}`}
                            className="text-xs font-semibold text-[#17352b] transition hover:text-[#204638]"
                          >
                            Abrir servico
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-lg font-semibold text-[#17352b]">
                Pendencias da carteira
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                O que ainda depende de retorno para este cliente.
              </p>
            </div>

            {openPendings.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-emerald-700">
                Nenhuma pendencia aberta para este cliente.
              </div>
            ) : (
              <div className="space-y-3 p-6">
                {openPendings.slice(0, 5).map((pending) => (
                  <article
                    key={pending.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-[#17352b]">
                          {pending.titulo ?? "-"}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {pending.origem ?? "Origem nao informada"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          pending.prazo_resposta &&
                          isBeforeTodayDateOnly(pending.prazo_resposta)
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {pending.prazo_resposta
                          ? formatSimpleDate(pending.prazo_resposta)
                          : pending.status ?? "-"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          {services.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum servico vinculado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Este cliente ainda nao possui servicos cadastrados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Nome do servico
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cidade
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
                      Despesas vinculadas
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Lucro previsto
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Prazo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceSummaries.map((summary) => (
                    <tr key={summary.service.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        <Link
                          href={`/servicos/${summary.service.id}`}
                          className="transition hover:text-[#204638]"
                        >
                          {summary.service.nome_servico ?? "-"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {summary.service.cidade ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatCurrency(summary.valorContratado)}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-700">
                        {formatCurrency(summary.recebido)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm ${
                          summary.emAberto < 0 ? "text-rose-700" : "text-slate-500"
                        }`}
                      >
                        {formatCurrency(summary.emAberto)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatCurrency(summary.despesasVinculadas)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm ${
                          summary.lucroLiquidoPrevisto < 0
                            ? "text-rose-700"
                            : "text-slate-500"
                        }`}
                      >
                        {formatCurrency(summary.lucroLiquidoPrevisto)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatSimpleDate(summary.service.prazo_final)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusClassName(
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
      </div>
    </AppShell>
  );
}
