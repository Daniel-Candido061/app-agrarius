import { connection } from "next/server";

import { AppShell } from "../components/app-shell";
import { requireAuth } from "../../lib/auth";
import { formatSimpleDateTime } from "../../lib/date-utils";
import { getCurrentOrganizationContext } from "../../lib/organization-context";
import { getOrganizationRoleRank } from "../../lib/organization-members";
import { getSupabaseServerClient } from "../../lib/supabase-server";
import { getCurrentUserShellProfile } from "../../lib/user-profiles";
import { OrganizationManagementView } from "./organization-management-view";
import { OrganizationSetupView } from "./organization-setup-view";

type OrganizationRow = {
  id: string;
  name: string | null;
  created_at: string | null;
};

type OrganizationMemberRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  nome_exibicao: string | null;
  email: string | null;
  papel: string | null;
};

async function getOrganizationRecord(organizationId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar organizacao ativa:", error.message);
    return null;
  }

  return (data ?? null) as OrganizationRow | null;
}

async function getOrganizationMembers(organizationId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, status, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar membros da organizacao:", error.message);
    return [];
  }

  return (data ?? []) as OrganizationMemberRow[];
}

async function getProfilesForMembers(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("id, nome_exibicao, email, papel")
    .in("id", userIds);

  if (error) {
    console.error("Erro ao buscar perfis dos membros:", error.message);
    return [];
  }

  return (data ?? []) as ProfileRow[];
}

export default async function OrganizacaoPage() {
  await connection();
  const authenticatedUser = await requireAuth();
  const supabaseServer = await getSupabaseServerClient();
  const organizationContext = await getCurrentOrganizationContext(
    authenticatedUser.id
  );

  const currentUserProfile = await getCurrentUserShellProfile(
    {
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    },
    supabaseServer
  );

  if (!organizationContext.organizationId) {
    return (
      <AppShell
        title="Configurar empresa"
        description="Finalize a estrutura inicial da sua conta para ativar o CRM multiempresa."
        currentPath="/organizacao"
        currentUserName={currentUserProfile.displayName}
        currentUserDetail={currentUserProfile.secondaryLabel}
        currentUserInitials={currentUserProfile.initials}
      >
        <OrganizationSetupView
          suggestedName={currentUserProfile.displayName || ""}
        />
      </AppShell>
    );
  }

  const [organization, members] = await Promise.all([
    getOrganizationRecord(organizationContext.organizationId),
    getOrganizationMembers(organizationContext.organizationId),
  ]);
  const profiles = await getProfilesForMembers(
    members.map((member) => member.user_id)
  );
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const normalizedMembers = members
    .map((member) => {
      const profile = profileMap.get(member.user_id);
      const displayName =
        profile?.nome_exibicao?.trim() ||
        profile?.email?.trim() ||
        member.user_id;

      return {
        membershipId: member.id,
        userId: member.user_id,
        displayName,
        email: profile?.email?.trim() || "-",
        profileRole: profile?.papel?.trim() || "",
        organizationRole: member.role,
        status: member.status,
        createdAtLabel: formatSimpleDateTime(member.created_at),
        isCurrentUser: member.user_id === authenticatedUser.id,
      };
    })
    .sort((leftMember, rightMember) => {
      const roleDifference =
        getOrganizationRoleRank(leftMember.organizationRole) -
        getOrganizationRoleRank(rightMember.organizationRole);

      if (roleDifference !== 0) {
        return roleDifference;
      }

      return leftMember.displayName.localeCompare(
        rightMember.displayName,
        "pt-BR"
      );
    });

  return (
    <AppShell
      title="Empresa e equipe"
      description="Gerencie o nome da empresa, papeis e acessos da organizacao ativa."
      currentPath="/organizacao"
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    >
      <OrganizationManagementView
        organization={{
          id: organization?.id ?? organizationContext.organizationId,
          name:
            organization?.name ??
            organizationContext.organizationName ??
            "Empresa ativa",
          createdAtLabel: formatSimpleDateTime(organization?.created_at ?? null),
        }}
        currentUserRole={organizationContext.organizationRole}
        members={normalizedMembers}
      />
    </AppShell>
  );
}
