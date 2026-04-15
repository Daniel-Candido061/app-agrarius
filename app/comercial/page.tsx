import { connection } from "next/server";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { ComercialView } from "./comercial-view";
import type { PropostaComercial } from "./types";
import type { ClienteOption } from "../servicos/types";

async function getPropostasComerciais() {
  const { data, error } = await supabase
    .from("propostas")
    .select(
      "id, nome_oportunidade, nome_contato, empresa, telefone, cidade, origem, tipo_servico, valor_estimado, proxima_acao_data, status, motivo_perda, observacoes, cliente_id, servico_id, convertido_em, created_at"
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao buscar propostas comerciais:", error.message);
    return [];
  }

  return (data ?? []) as PropostaComercial[];
}

async function getClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao buscar clientes do comercial:", error.message);
    return [];
  }

  return (data ?? []) as ClienteOption[];
}

export default async function ComercialPage() {
  await connection();
  await requireAuth();

  const [proposals, clients] = await Promise.all([
    getPropostasComerciais(),
    getClientes(),
  ]);

  return <ComercialView proposals={proposals} clients={clients} />;
}
