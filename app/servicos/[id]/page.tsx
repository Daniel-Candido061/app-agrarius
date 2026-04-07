import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { formatDateOnly } from "../../../lib/date-utils";
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

function getServiceStatusClassName(status: string | null) {
  const normalizedStatus =
    status
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase() ?? "";

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
  const normalizedStatus =
    status
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase() ?? "";

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
  const normalizedType = type?.toLowerCase();

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
    return service.cliente[0]?.nome ?? "Cliente não encontrado";
  }

  return service.cliente?.nome ?? "Cliente não encontrado";
}

async function getServico(id: number) {
  const { data, error } = await supabase
    .from("servicos")
    .select(
      "id, cliente_id, nome_servico, cidade, valor, prazo, prazo_final, observacoes, status, cliente:clientes(id, nome)"
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

  const totalReceitas = financialEntries
    .filter((entry) => entry.tipo?.toLowerCase() === "receita")
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const totalDespesas = financialEntries
    .filter((entry) => entry.tipo?.toLowerCase() === "despesa")
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const saldoServico = totalReceitas - totalDespesas;
  const totalLancamentos = financialEntries.length;

  return (
    <AppShell
      title="Detalhes do serviço"
      description="Resumo do serviço, do cliente vinculado e do financeiro relacionado."
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
        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Serviço</p>
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

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
                  Valor
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatCurrency(service.valor)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Prazo
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatDateOnly(service.prazo)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Prazo final
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatDateOnly(service.prazo_final)}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Observações
                </p>
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {service.observacoes?.trim() || "Sem observações"}
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-5">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
              <p className="text-sm font-medium text-slate-500">Total de receitas</p>
              <strong className="mt-4 block text-3xl font-semibold text-[#17352b]">
                {formatCurrency(totalReceitas)}
              </strong>
              <p className="mt-3 text-sm text-slate-500">
                Soma de todos os lançamentos de receita.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
              <p className="text-sm font-medium text-slate-500">Total de despesas</p>
              <strong className="mt-4 block text-3xl font-semibold text-[#17352b]">
                {formatCurrency(totalDespesas)}
              </strong>
              <p className="mt-3 text-sm text-slate-500">
                Soma de todos os lançamentos de despesa.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
              <p className="text-sm font-medium text-slate-500">Saldo final</p>
              <strong
                className={`mt-4 block text-3xl font-semibold ${
                  saldoServico >= 0 ? "text-[#17352b]" : "text-rose-700"
                }`}
              >
                {formatCurrency(saldoServico)}
              </strong>
              <p className="mt-3 text-sm text-slate-500">
                Resultado entre receitas e despesas.
              </p>
            </article>
          </div>
        </section>

        <ServiceTasksSection serviceId={serviceId} tasks={tasks} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#17352b]">
                  Histórico financeiro
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Todos os lançamentos financeiros vinculados a este serviço.
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
                  {totalLancamentos} lançamentos
                </span>
              </div>
            </div>
          </div>

          {financialEntries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum lançamento vinculado
              </h2>
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
                      Categoria
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
                        {formatDateOnly(entry.data)}
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
