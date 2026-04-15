import { supabase } from "./supabase";

export type UserDisplayMap = Record<string, string>;
export type UserOption = {
  id: string;
  label: string;
};

export type CurrentUserShellProfile = {
  displayName: string;
  secondaryLabel: string;
  initials: string;
};

type PerfilUsuarioResumo = {
  id: string;
  nome_exibicao: string | null;
  email: string | null;
  papel: string | null;
  ativo?: boolean | null;
};

function getUserDisplayName(profile: PerfilUsuarioResumo) {
  const displayName = profile.nome_exibicao?.trim();

  if (displayName) {
    return displayName;
  }

  const email = profile.email?.trim();

  if (email) {
    return email;
  }

  return profile.id;
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "AG";
  }

  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export async function getUserDisplayMap(
  userIds: Array<string | null | undefined>
): Promise<UserDisplayMap> {
  const normalizedIds = Array.from(
    new Set(
      userIds
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  if (normalizedIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("id, nome_exibicao, email, papel")
    .in("id", normalizedIds);

  if (error) {
    console.error("Erro ao buscar perfis de usuario:", error.message);
    return {};
  }

  return Object.fromEntries(
    ((data ?? []) as PerfilUsuarioResumo[]).map((profile) => [
      profile.id,
      getUserDisplayName(profile),
    ])
  );
}

export async function getUserOptions(params?: {
  currentUserId?: string | null;
  currentUserEmail?: string | null;
}): Promise<UserOption[]> {
  const { currentUserId = null, currentUserEmail = null } = params ?? {};

  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("id, nome_exibicao, email, ativo")
    .neq("ativo", false)
    .order("nome_exibicao", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Erro ao buscar opções de usuário:", error.message);
  }

  const normalizedOptions = ((data ?? []) as PerfilUsuarioResumo[]).map(
    (profile) => ({
      id: profile.id,
      label: getUserDisplayName(profile),
    })
  );

  if (
    currentUserId &&
    !normalizedOptions.some((option) => option.id === currentUserId)
  ) {
    normalizedOptions.unshift({
      id: currentUserId,
      label: currentUserEmail?.trim() || "Usuário atual",
    });
  }

  return normalizedOptions;
}

export function getUserLabel(
  userDisplayMap: UserDisplayMap,
  userId: string | null | undefined,
  fallback?: string | null
) {
  const normalizedFallback = fallback?.trim();

  if (normalizedFallback) {
    return normalizedFallback;
  }

  if (!userId) {
    return "-";
  }

  return userDisplayMap[userId] ?? "-";
}

export async function getCurrentUserShellProfile(params: {
  userId: string;
  email?: string | null;
}): Promise<CurrentUserShellProfile> {
  const { userId, email } = params;

  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("nome_exibicao, papel")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil atual do usuario:", error.message);
  }

  const displayName =
    data?.nome_exibicao?.trim() || email?.trim() || "Sessao ativa";
  const secondaryLabel = data?.papel?.trim() || "Conta autenticada";

  return {
    displayName,
    secondaryLabel,
    initials: getInitials(displayName),
  };
}
