import { connection } from "next/server";
import { requireAuth } from "../../lib/auth";
import { requireCurrentOrganization } from "../../lib/organization-context";
import { scopeQueryToOrganization } from "../../lib/organization-scope";
import { getSupabaseServerClient } from "../../lib/supabase-server";
import {
  getCurrentUserShellProfile,
  getUserDisplayMap,
  getUserOptions,
} from "../../lib/user-profiles";
import { TarefasView } from "./tarefas-view";
import type { ServicoOption, Tarefa } from "./types";

async function getTarefas(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("tarefas")
      .select(
        "id, organization_id, titulo, servico_id, responsavel, responsavel_id, data_limite, prioridade, status, observacao, criado_por, atualizado_por"
      )
      .order("data_limite", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar tarefas no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as Tarefa[];
}

async function getServicos(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servicos")
      .select("id, organization_id, nome_servico, cliente:clientes!servicos_cliente_same_organization_fkey(id, nome)")
      .order("nome_servico", { ascending: true }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar serviços para tarefas:", error.message);
    return [];
  }

  return (data ?? []) as ServicoOption[];
}

export default async function TarefasPage() {
  await connection();
  const authenticatedUser = await requireAuth();
  const supabaseServer = await getSupabaseServerClient();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  const [tasks, services] = await Promise.all([
    getTarefas(organizationContext.organizationId),
    getServicos(organizationContext.organizationId),
  ]);
  const [userDisplayNames, currentUserProfile, userOptions] = await Promise.all([
    getUserDisplayMap(
      tasks.flatMap((task) => [
        task.responsavel_id,
        task.criado_por,
        task.atualizado_por,
      ]),
      { organizationId: organizationContext.organizationId },
      supabaseServer
    ),
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }, supabaseServer),
    getUserOptions({
      currentUserId: authenticatedUser.id,
      currentUserEmail: authenticatedUser.email,
      organizationId: organizationContext.organizationId,
    }, supabaseServer),
  ]);

  return (
    <TarefasView
      tasks={tasks}
      services={services}
      currentUserId={authenticatedUser.id}
      currentOrganizationId={organizationContext.organizationId}
      userDisplayNames={userDisplayNames}
      userOptions={userOptions}
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    />
  );
}
