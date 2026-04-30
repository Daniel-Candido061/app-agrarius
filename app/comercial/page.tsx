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
import { ComercialView } from "./comercial-view";
import type { PropostaComercial } from "./types";
import type { ClienteOption } from "../servicos/types";

async function getPropostasComerciais(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase
      .from("propostas")
      .select(
        "id, organization_id, nome_oportunidade, nome_contato, empresa, telefone, cidade, origem, tipo_servico, valor_estimado, proxima_acao_data, status, motivo_perda, observacoes, cliente_id, servico_id, convertido_em, created_at, criado_por, atualizado_por, responsavel_id"
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar propostas comerciais:", error.message);
    return [];
  }

  return (data ?? []) as PropostaComercial[];
}

async function getClientes(organizationId?: string | null) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await scopeQueryToOrganization(
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true }),
    organizationId
  );

  if (error) {
    console.error("Erro ao buscar clientes do comercial:", error.message);
    return [];
  }

  return (data ?? []) as ClienteOption[];
}

export default async function ComercialPage() {
  await connection();
  const authenticatedUser = await requireAuth();
  const supabaseServer = await getSupabaseServerClient();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  const [proposals, clients] = await Promise.all([
    getPropostasComerciais(organizationContext.organizationId),
    getClientes(organizationContext.organizationId),
  ]);
  const [currentUserProfile, userDisplayNames, userOptions] = await Promise.all([
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }, supabaseServer),
    getUserDisplayMap(
      proposals.flatMap((proposal) => [
        proposal.responsavel_id,
        proposal.criado_por,
        proposal.atualizado_por,
      ]),
      { organizationId: organizationContext.organizationId },
      supabaseServer
    ),
    getUserOptions({
      currentUserId: authenticatedUser.id,
      currentUserEmail: authenticatedUser.email,
      organizationId: organizationContext.organizationId,
    }, supabaseServer),
  ]);

  return (
    <ComercialView
      proposals={proposals}
      clients={clients}
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
