import { connection } from "next/server";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import {
  getCurrentUserShellProfile,
  getUserDisplayMap,
} from "../../lib/user-profiles";
import { FinanceiroView } from "./financeiro-view";
import type { LancamentoFinanceiro, ServicoOption } from "./types";

async function getLancamentosFinanceiros() {
  const { data, error } = await supabase
    .from("financeiro")
    .select("id, tipo, categoria, descricao, valor, data, servico_id, status, criado_por, atualizado_por, responsavel_id")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar lançamentos financeiros:", error.message);
    return [];
  }

  return (data ?? []) as LancamentoFinanceiro[];
}

async function getServicos() {
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome_servico, valor, created_at, status, cliente:clientes(id, nome)")
    .order("nome_servico", { ascending: true });

  if (error) {
    console.error("Erro ao buscar serviços no Supabase:", error.message);
    return [];
  }

  return (data ?? []) as ServicoOption[];
}

export default async function FinanceiroPage() {
  await connection();
  const authenticatedUser = await requireAuth();

  const [entries, services] = await Promise.all([
    getLancamentosFinanceiros(),
    getServicos(),
  ]);
  const [currentUserProfile, userDisplayNames] = await Promise.all([
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }),
    getUserDisplayMap(
      entries.flatMap((entry) => [
        entry.responsavel_id,
        entry.criado_por,
        entry.atualizado_por,
      ])
    ),
  ]);

  return (
    <FinanceiroView
      entries={entries}
      services={services}
      currentUserId={authenticatedUser.id}
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
      userDisplayNames={userDisplayNames}
    />
  );
}
