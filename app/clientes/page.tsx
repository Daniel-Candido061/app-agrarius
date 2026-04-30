import { connection } from "next/server";
import { ClientesView } from "./clientes-view";
import { requireAuth } from "../../lib/auth";
import { requireCurrentOrganization } from "../../lib/organization-context";
import { scopeQueryToOrganization } from "../../lib/organization-scope";
import { getSupabaseServerClient } from "../../lib/supabase-server";
import { getCurrentUserShellProfile } from "../../lib/user-profiles";
import type {
  Cliente,
  ClientePortfolioFinanceiro,
  ClientePortfolioServico,
} from "./types";

async function getClientes(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("clientes")
      .select("id, nome, telefone, email, cidade, status")
      .order("created_at", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar clientes no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as Cliente[];
}

async function getServicosDosClientes(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase.from("servicos").select("id, cliente_id, valor, status"),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar serviços dos clientes:", error.message);
    return [];
  }

  return (data ?? []) as ClientePortfolioServico[];
}

async function getFinanceiroDosServicos(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase.from("financeiro").select("tipo, valor, servico_id, status"),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar financeiro dos serviços:", error.message);
    return [];
  }

  return (data ?? []) as ClientePortfolioFinanceiro[];
}

export default async function ClientesPage() {
  await connection();
  const authenticatedUser = await requireAuth();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  const [clients, services, financialEntries] = await Promise.all([
    getClientes(organizationContext.organizationId),
    getServicosDosClientes(organizationContext.organizationId),
    getFinanceiroDosServicos(organizationContext.organizationId),
  ]);
  const currentUserProfile = await getCurrentUserShellProfile({
    userId: authenticatedUser.id,
    email: authenticatedUser.email,
  });

  return (
    <ClientesView
      clients={clients}
      services={services}
      financialEntries={financialEntries}
      currentUserId={authenticatedUser.id}
      currentOrganizationId={organizationContext.organizationId}
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    />
  );
}
