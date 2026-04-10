import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { SummaryCard, SummaryCardsGrid } from "../../components/summary-card";
import {
  formatSimpleDate,
  getElapsedDaysFromDateTime,
} from "../../../lib/date-utils";
import { requireAuth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import type { Servico, ServicoFinanceiro } from "../types";
import type { Tarefa } from "../../tarefas/types";
import { ServiceTasksSection } from "./service-tasks-section";

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

function isRevenue(entry: ServicoFinanceiro) {
  return normalizeText(entry.tipo) === "receita";
}

function isExpense(entry: ServicoFinanceiro) {
  return normalizeText(entry.tipo) === "despesa";
}

function isReceived(entry: ServicoFinanceiro) {
  return normalizeText(entry.status) === "recebido";
}

function isPaid(entry: ServicoFinanceiro) {
  return normalizeText(entry.status) === "pago";
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

function getEntryTypeClassName(type: string | null) {
  const normalizedType = normalizeText(type);

  if (normalizedType === "receita") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedType === "despesa") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getClientName(service: Servico) {
  if (Array.isArray(service.cliente)) {
    return service.cliente[0]?.nome ?? "Cliente nao encontrado";
  }

  return service.cliente?.nome ?? "Cliente nao encontrado";
}

async function getServico(id: number) {
  const { data, error } = await supabase
    .from("servicos")
    .select(
      "id, cliente_id, created_at, nome_servico, cidade, valor, prazo, prazo_final, observacoes, status, cliente:clientes(id, nome)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar servico:", error.message);
    return null;
  }

  return (data ?? null) as Servico | null;
}

async function getLancamentosDoServico(id: number) {
  const { data, error } = await supabase
    .from("financeiro")
    .select("id, tipo, categoria, descricao, valor, data, servico_id, status")
    .eq("servico_id", id)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar financeiro do servico:", error.message);
    return [];
  }

  return (data ?? []) as ServicoFinanceiro[];
}

async function getTarefasDoServico(id: number) {
  const { data, error } = await supabase
    .from("tarefas")
    .select("id, titulo, servico_id, responsavel, data_limite, prioridade, status, observacao")
    .eq("servico_id", id)
    .order("data_limite", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar tarefas do servico:", error.message);
    return [];
  }

  return (data ?? []) as Tarefa[];
}

export default async function ServicoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await requireAuth();

  const { id } = await params;
  const serviceId = Number(id);

  if (Number.isNaN(serviceId)) {
    notFound();
  }

  const [service, financialEntries, tasks] = await Promise.all([
    getServico(serviceId),
    getLancamentosDoServico(serviceId),
    getTarefasDoServico(serviceId),
  ]);

  if (!service) {
    notFound();
  }

  const valorContratado = getNumericValue(service.valor);

  const totalRecebido = financialEntries
    .filter((entry) => isRevenue(entry) && isReceived(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const valorAReceber = valorContratado - totalRecebido;

  const totalDespesasPagas = financialEntries
    .filter((entry) => isExpense(entry) && isPaid(entry))
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const totalDespesasVinculadas = financialEntries
    .filter(isExpense)
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const lucroLiquidoRealizado = totalRecebido - totalDespesasPagas;
  const totalLancamentos = financialEntries.length;
  const tempoDecorridoEmDias = getElapsedDaysFromDateTime(service.created_at);

  const financialSummaryCards = [
    {
      title: "Valor contratado",
      value: formatCurrency(valorContratado),
      detail: "Valor definido no cadastro do servico.",
      tone: "neutral" as const,
      valueClassName: "text-[#163728]",
    },
    {
      title: "Total recebido",
      value: formatCurrency(totalRecebido),
      detail: "Receitas recebidas vinculadas ao servico.",
      tone: "success" as const,
      valueClassName: "text-[#163728]",
    },
    {
      title: "Valor a receber",
      value: formatCurrency(valorAReceber),
      detail: "Valor contratado menos o total recebido.",
      tone: valorAReceber >= 0 ? ("warning" as const) : ("danger" as const),
      valueClassName: valorAReceber >= 0 ? "text-[#163728]" : "text-rose-700",
    },
    {
      title: "Despesas vinculadas",
      value: formatCurrency(totalDespesasVinculadas),
      detail: "Todas as despesas vinculadas ao servico.",
      tone: "warning" as const,
      valueClassName: "text-[#163728]",
    },
    {
      title: "Lucro liquido realizado",
      value: formatCurrency(lucroLiquidoRealizado),
      detail: "Total recebido menos despesas pagas.",
      tone:
        lucroLiquidoRealizado >= 0
          ? ("success" as const)
          : ("danger" as const),
      valueClassName:
        lucroLiquidoRealizado >= 0 ? "text-[#163728]" : "text-rose-700",
    },
  ];

  return (
    <AppShell
      title="Detalhes do servico"
      description="Resumo do servico, do cliente vinculado e do financeiro relacionado."
      currentPath="/servicos"
      action={
        <Link
          href="/servicos"
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
                <p className="text-sm font-medium text-slate-500">Servico</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#17352b]">
                  {service.nome_servico ?? "-"}
                </h2>
              </div>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusClassName(
                  service.status
                )}`}
              >
                {service.status ?? "Sem status"}
              </span>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Cliente
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {getClientName(service)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Cidade
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {service.cidade ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Valor contratado
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatCurrency(service.valor)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Criado em
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatSimpleDate(service.created_at)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Prazo final
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatSimpleDate(service.prazo_final)}
                </p>
              </div>

              <div className="sm:col-span-2 xl:col-span-3">
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Tempo decorrido
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {tempoDecorridoEmDias === null
                        ? "-"
                        : `${tempoDecorridoEmDias} dia${
                            tempoDecorridoEmDias === 1 ? "" : "s"
                          }`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 xl:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Observacao
                </p>
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {service.observacoes?.trim() || "Sem observacoes"}
                </p>
              </div>
            </div>
          </article>

          <SummaryCardsGrid className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
            {financialSummaryCards.map((card) => (
              <SummaryCard
                key={card.title}
                title={card.title}
                value={card.value}
                detail={card.detail}
                tone={card.tone}
                valueClassName={card.valueClassName}
                compact
              />
            ))}
          </SummaryCardsGrid>
        </section>

        <ServiceTasksSection serviceId={serviceId} tasks={tasks} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#17352b]">
                  Historico financeiro
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Todos os lancamentos financeiros vinculados a este servico.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  Receitas
                </span>
                <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                  Despesas
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {totalLancamentos} lancamentos
                </span>
              </div>
            </div>
          </div>

          {financialEntries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum lancamento vinculado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Este servico ainda nao possui receitas ou despesas cadastradas.
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
                      Descricao
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
                  {financialEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50/80 ${
                        entry.tipo?.toLowerCase() === "receita"
                          ? "bg-emerald-50/30"
                          : entry.tipo?.toLowerCase() === "despesa"
                            ? "bg-rose-50/30"
                            : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getEntryTypeClassName(
                            entry.tipo
                          )}`}
                        >
                          {entry.tipo ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {entry.categoria ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {entry.descricao ?? "-"}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-medium ${
                          entry.tipo?.toLowerCase() === "receita"
                            ? "text-emerald-700"
                            : entry.tipo?.toLowerCase() === "despesa"
                              ? "text-rose-700"
                              : "text-slate-500"
                        }`}
                      >
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
    </AppShell>
  );
}
