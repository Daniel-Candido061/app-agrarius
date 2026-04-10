import { connection } from "next/server";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { ServicosView } from "./servicos-view";
import type { ClienteOption, Servico, ServicoFinanceiro } from "./types";

async function getServicos() {
  const { data, error } = await supabase
    .from("servicos")
    .select(
      "id, cliente_id, created_at, nome_servico, cidade, valor, prazo, prazo_final, observacoes, status, cliente:clientes(id, nome)"
    )
    .order("prazo_final", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar serviços no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as Servico[];
}

async function getClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao buscar clientes no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as ClienteOption[];
}

async function getFinanceiroPorServico() {
  const { data, error } = await supabase
    .from("financeiro")
    .select("id, tipo, categoria, descricao, valor, data, servico_id, status")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Erro ao buscar lançamentos financeiros dos serviços:",
      error.message
    );
    return [];
  }

  return (data ?? []) as ServicoFinanceiro[];
}

export default async function ServicosPage() {
  await connection();
  await requireAuth();

  const [services, clients, financialEntries] = await Promise.all([
    getServicos(),
    getClientes(),
    getFinanceiroPorServico(),
  ]);

  return (
    <ServicosView
      services={services}
      clients={clients}
      financialEntries={financialEntries}
    />
  );
}
