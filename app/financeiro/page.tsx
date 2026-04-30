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
import { FinanceiroView } from "./financeiro-view";
import type { LancamentoFinanceiro, ServicoOption } from "./types";

async function getLancamentosFinanceiros(organizationId?: string | null) {
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
    console.error("Erro ao buscar lançamentos financeiros:", error.message);
    return [];
  }

  return (data ?? []) as LancamentoFinanceiro[];
}

async function getServicos(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("servicos")
      .select("id, organization_id, nome_servico, valor, created_at, status, cliente:clientes!servicos_cliente_same_organization_fkey(id, nome)")
      .order("nome_servico", { ascending: true }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar serviços no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as ServicoOption[];
}

export default async function FinanceiroPage() {
  await connection();
  const authenticatedUser = await requireAuth();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  const [entries, services] = await Promise.all([
    getLancamentosFinanceiros(organizationContext.organizationId),
    getServicos(organizationContext.organizationId),
  ]);
  const [currentUserProfile, userDisplayNames, userOptions] = await Promise.all([
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }),
    getUserDisplayMap(
      entries.flatMap((entry) => [
        entry.responsavel_id,
        entry.criado_por,
        entry.atualizado_por,
      ]),
      { organizationId: organizationContext.organizationId }
    ),
    getUserOptions({
      currentUserId: authenticatedUser.id,
      currentUserEmail: authenticatedUser.email,
      organizationId: organizationContext.organizationId,
    }),
  ]);

  return (
    <FinanceiroView
      entries={entries}
      services={services}
      currentUserId={authenticatedUser.id}
      currentOrganizationId={organizationContext.organizationId}
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
      userDisplayNames={userDisplayNames}
      userOptions={userOptions}
    />
  );
}
