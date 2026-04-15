import { connection } from "next/server";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUserShellProfile,
  getUserDisplayMap,
  getUserOptions,
} from "../../lib/user-profiles";
import { ServicosView } from "./servicos-view";
import type { ClienteOption, Servico, ServicoFinanceiro } from "./types";

async function getServicos() {
  const { data, error } = await supabase
    .from("servicos")
    .select(
      "id, cliente_id, created_at, criado_por, atualizado_por, responsavel_id, data_entrada, nome_servico, tipo_servico, situacao_operacional, cidade, valor, prazo, prazo_final, observacoes, status, cliente:clientes(id, nome)"
    )
    .order("data_entrada", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

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
    .select("id, tipo, categoria, descricao, valor, data, servico_id, status, criado_por, atualizado_por, responsavel_id")
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
  const authenticatedUser = await requireAuth();

  const [services, clients, financialEntries] = await Promise.all([
    getServicos(),
    getClientes(),
    getFinanceiroPorServico(),
  ]);
  const [userDisplayNames, currentUserProfile, userOptions] = await Promise.all([
    getUserDisplayMap(
      services.flatMap((service) => [
        service.responsavel_id,
        service.criado_por,
        service.atualizado_por,
      ])
    ),
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }),
    getUserOptions({
      currentUserId: authenticatedUser.id,
      currentUserEmail: authenticatedUser.email,
    }),
  ]);

  return (
    <ServicosView
      services={services}
      clients={clients}
      financialEntries={financialEntries}
      currentUserId={authenticatedUser.id}
      userDisplayNames={userDisplayNames}
      userOptions={userOptions}
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    />
  );
}
