import "server-only";

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "./supabase-server";

type MembershipRow = {
  organization_id: string;
  role: string | null;
  organization?:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type ProfileOrganizationRow = {
  default_organization_id: string | null;
};

type OrganizationNameRow = {
  id: string;
  name: string | null;
};

export type OrganizationContext = {
  organizationId: string | null;
  organizationName: string | null;
  organizationRole: string | null;
  hasOrganization: boolean;
};

export async function getCurrentOrganizationContext(
  userId: string
): Promise<OrganizationContext> {
  try {
    const supabase = await getSupabaseServerClient();
    const [{ data: memberships, error: membershipsError }, { data: profile }] =
      await Promise.all([
        supabase
          .from("organization_members")
          .select("organization_id, role, organization:organizations(name)")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: true }),
        supabase
          .from("perfis_usuario")
          .select("default_organization_id")
          .eq("id", userId)
          .maybeSingle(),
      ]);

    const membershipRows = (memberships ?? []) as MembershipRow[];
    const profileRow = (profile ?? null) as ProfileOrganizationRow | null;
    const defaultOrganizationId = profileRow?.default_organization_id ?? null;

    if (membershipsError) {
      console.warn(
        "Leitura de memberships indisponivel, tentando fallback pelo perfil:",
        membershipsError.message
      );
    }

    if (membershipRows.length === 0) {
      return {
        organizationId: null,
        organizationName: null,
        organizationRole: null,
        hasOrganization: false,
      };
    }

    const activeMembership =
      membershipRows.find(
        (membership) => membership.organization_id === defaultOrganizationId
      ) ?? membershipRows[0] ?? null;

    const resolvedOrganizationId = activeMembership?.organization_id ?? null;

    if (!resolvedOrganizationId) {
      return {
        organizationId: null,
        organizationName: null,
        organizationRole: null,
        hasOrganization: false,
      };
    }

    let organizationName = activeMembership
      ? Array.isArray(activeMembership.organization)
        ? activeMembership.organization[0]?.name ?? null
        : activeMembership.organization?.name ?? null
      : null;

    if (!organizationName) {
      const supabase = await getSupabaseServerClient();
      const { data: organizationRow } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", resolvedOrganizationId)
        .maybeSingle();

      organizationName = (organizationRow as OrganizationNameRow | null)?.name ?? null;
    }

    return {
      organizationId: resolvedOrganizationId,
      organizationName,
      organizationRole: activeMembership?.role ?? null,
      hasOrganization: true,
    };
  } catch (error) {
    console.warn(
      "Falha inesperada ao resolver o contexto de organizacao:",
      error
    );

    return {
      organizationId: null,
      organizationName: null,
      organizationRole: null,
      hasOrganization: false,
    };
  }
}

export async function requireCurrentOrganization(
  userId: string
): Promise<OrganizationContext> {
  const organizationContext = await getCurrentOrganizationContext(userId);

  if (!organizationContext.hasOrganization || !organizationContext.organizationId) {
    redirect("/organizacao");
  }

  return organizationContext;
}

export async function redirectIfOrganizationAlreadyConfigured(userId: string) {
  const organizationContext = await getCurrentOrganizationContext(userId);

  if (organizationContext.hasOrganization && organizationContext.organizationId) {
    redirect("/painel");
  }

  return organizationContext;
}
