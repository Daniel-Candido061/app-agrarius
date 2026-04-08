import { connection } from "next/server";
import { ClientesView } from "./clientes-view";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import type {
  Cliente,
  ClientePortfolioFinanceiro,
  ClientePortfolioServico,
} from "./types";

async function getClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, telefone, email, cidade, status")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar clientes no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as Cliente[];
}

async function getServicosDosClientes() {
  const { data, error } = await supabase
    .from("servicos")
    .select("id, cliente_id, valor, status");

  if (error) {
    console.error("Erro ao buscar serviços dos clientes:", error.message);
    return [];
  }

  return (data ?? []) as ClientePortfolioServico[];
}

async function getFinanceiroDosServicos() {
  const { data, error } = await supabase
    .from("financeiro")
    .select("tipo, valor, servico_id, status");

  if (error) {
    console.error("Erro ao buscar financeiro dos serviços:", error.message);
    return [];
  }

  return (data ?? []) as ClientePortfolioFinanceiro[];
}

export default async function ClientesPage() {
  await connection();
  await requireAuth();

  const [clients, services, financialEntries] = await Promise.all([
    getClientes(),
    getServicosDosClientes(),
    getFinanceiroDosServicos(),
  ]);

  return (
    <ClientesView
      clients={clients}
      services={services}
      financialEntries={financialEntries}
    />
  );
}
