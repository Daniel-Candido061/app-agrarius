import { connection } from "next/server";
import { ClientesView } from "./clientes-view";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import type { Cliente } from "./types";

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

export default async function ClientesPage() {
  await connection();
  await requireAuth();

  const clients = await getClientes();

  return <ClientesView clients={clients} />;
}
