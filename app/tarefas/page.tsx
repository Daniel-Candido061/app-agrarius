import { connection } from "next/server";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { TarefasView } from "./tarefas-view";
import type { ServicoOption, Tarefa } from "./types";

async function getTarefas() {
  const { data, error } = await supabase
    .from("tarefas")
    .select(
      "id, titulo, servico_id, responsavel, data_limite, prioridade, status, observacao"
    )
    .order("data_limite", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar tarefas no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as Tarefa[];
}

async function getServicos() {
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome_servico, cliente:clientes(id, nome)")
    .order("nome_servico", { ascending: true });

  if (error) {
    console.error("Erro ao buscar serviços para tarefas:", error.message);
    return [];
  }

  return (data ?? []) as ServicoOption[];
}

export default async function TarefasPage() {
  await connection();
  await requireAuth();

  const [tasks, services] = await Promise.all([getTarefas(), getServicos()]);

  return <TarefasView tasks={tasks} services={services} />;
}
