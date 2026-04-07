import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { formatDateOnly } from "../../../lib/date-utils";
import { supabase } from "../../../lib/supabase";
import type { Cliente, ClienteServico } from "../types";

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

function getStatusClassName(status: string | null) {
  const normalizedStatus =
    status
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase() ?? "";

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

  if (normalizedStatus === "concluído" || normalizedStatus === "concluido") {
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

export default async function ClienteDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const clientId = Number(id);

  if (Number.isNaN(clientId)) {
    notFound();
  }

  const [client, services] = await Promise.all([
    getCliente(clientId),
    getServicosDoCliente(clientId),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <AppShell
      title="Detalhes do cliente"
      description="Resumo do cliente e dos serviços vinculados."
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
        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
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

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
                  Total de serviços
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {services.length}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
            <p className="text-sm font-medium text-slate-500">Resumo</p>
            <strong className="mt-4 block text-3xl font-semibold text-[#17352b]">
              {services.length}
            </strong>
            <p className="mt-3 text-sm text-slate-500">
              Quantidade de serviços vinculados a este cliente.
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          {services.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#17352b]">
                Nenhum serviço vinculado
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Este cliente ainda não possui serviços cadastrados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {service.nome_servico ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {service.cidade ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatCurrency(service.valor)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDateOnly(service.prazo_final)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusClassName(
                            service.status
                          )}`}
                        >
                          {service.status ?? "Sem status"}
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
