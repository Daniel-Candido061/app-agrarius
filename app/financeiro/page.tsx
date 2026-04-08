import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import { FinanceiroView } from "./financeiro-view";
import type { LancamentoFinanceiro, ServicoOption } from "./types";

async function getLancamentosFinanceiros() {
  const { data, error } = await supabase
    .from("financeiro")
    .select("id, tipo, categoria, descricao, valor, data, servico_id, status")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar lancamentos financeiros:", error.message);
    return [];
  }

  return (data ?? []) as LancamentoFinanceiro[];
}

async function getServicos() {
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome_servico, cliente:clientes(id, nome)")
    .order("nome_servico", { ascending: true });

  if (error) {
    console.error("Erro ao buscar servicos no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as ServicoOption[];
}

export default async function FinanceiroPage() {
  await connection();

  const [entries, services] = await Promise.all([
    getLancamentosFinanceiros(),
    getServicos(),
  ]);

  return <FinanceiroView entries={entries} services={services} />;
}
