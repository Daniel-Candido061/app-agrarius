import { connection } from "next/server";

import { AppShell } from "../components/app-shell";
import { requireAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { getCurrentUserShellProfile } from "../../lib/user-profiles";
import { AccountView } from "./account-view";

type PerfilUsuario = {
  nome_exibicao: string | null;
  email: string | null;
  papel: string | null;
};

async function getCurrentProfile(userId: string) {
  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("nome_exibicao, email, papel")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil do usuario:", error.message);
    return null;
  }

  return (data ?? null) as PerfilUsuario | null;
}

export default async function ContaPage() {
  await connection();
  const authenticatedUser = await requireAuth();

  const [currentUserProfile, profile] = await Promise.all([
    getCurrentUserShellProfile({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    }),
    getCurrentProfile(authenticatedUser.id),
  ]);

  return (
    <AppShell
      title="Conta e perfil"
      description="Ajuste seus dados de exibicao para preparar atribuicoes, rastreabilidade e colaboracao futura no sistema."
      currentPath="/conta"
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    >
      <AccountView
        userId={authenticatedUser.id}
        authEmail={authenticatedUser.email ?? ""}
        initialProfile={{
          nome_exibicao: profile?.nome_exibicao ?? "",
          email: profile?.email ?? authenticatedUser.email ?? "",
          papel: profile?.papel ?? "",
        }}
      />
    </AppShell>
  );
}
