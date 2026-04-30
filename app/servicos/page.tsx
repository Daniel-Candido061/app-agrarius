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
import { ServicosView } from "./servicos-view";
import type { ClienteOption, Servico, ServicoFinanceiro } from "./types";

async function getServicos(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servicos")
      .select(
        "id, organization_id, cliente_id, created_at, criado_por, atualizado_por, responsavel_id, data_entrada, nome_servico, tipo_servico, situacao_operacional, cidade, valor, prazo, prazo_final, observacoes, status, cliente:clientes!servicos_cliente_same_organization_fkey(id, nome)"
      )
      .order("data_entrada", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar serviços no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as Servico[];
}

async function getClientes(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar clientes no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as ClienteOption[];
}

async function getFinanceiroPorServico(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("financeiro")
      .select("id, organization_id, tipo, categoria, descricao, valor, data, servico_id, status, criado_por, atualizado_por, responsavel_id")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false }),
    organizationId
  );

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
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  const [services, clients, financialEntries] = await Promise.all([
    getServicos(organizationContext.organizationId),
    getClientes(organizationContext.organizationId),
    getFinanceiroPorServico(organizationContext.organizationId),
  ]);
  const [userDisplayNames, currentUserProfile, userOptions] = await Promise.all([
    getUserDisplayMap(
      services.flatMap((service) => [
        service.responsavel_id,
        service.criado_por,
        service.atualizado_por,
      ]),
      { organizationId: organizationContext.organizationId }
    ),
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }),
    getUserOptions({
      currentUserId: authenticatedUser.id,
      currentUserEmail: authenticatedUser.email,
      organizationId: organizationContext.organizationId,
    }),
  ]);

  return (
    <ServicosView
      services={services}
      clients={clients}
      financialEntries={financialEntries}
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
