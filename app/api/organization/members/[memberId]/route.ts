import { NextResponse } from "next/server";

import { requireAuth } from "../../../../../lib/auth";
import { requireCurrentOrganization } from "../../../../../lib/organization-context";
import {
  isOrganizationManageableStatus,
  isOrganizationRole,
} from "../../../../../lib/organization-members";
import { getSupabaseServerClient } from "../../../../../lib/supabase-server";

type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
};

async function getOrganizationMember(memberId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role, status")
    .eq("id", memberId)
    .maybeSingle();

  return {
    member: (data ?? null) as OrganizationMemberRow | null,
    error,
  };
}

async function getActiveAdminCount(organizationId: string) {
  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("role", "admin");

  return {
    count: count ?? 0,
    error,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  const authenticatedUser = await requireAuth();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  if (organizationContext.organizationRole !== "admin") {
    return NextResponse.json(
      { error: "organization_admin_required" },
      { status: 403 }
    );
  }

  const { memberId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { role?: string; status?: string }
    | null;

  const role = body?.role?.trim();
  const status = body?.status?.trim();

  if (!role && !status) {
    return NextResponse.json(
      { error: "organization_member_update_required" },
      { status: 400 }
    );
  }

  if (role && !isOrganizationRole(role)) {
    return NextResponse.json(
      { error: "organization_role_invalid" },
      { status: 400 }
    );
  }

  if (status && !isOrganizationManageableStatus(status)) {
    return NextResponse.json(
      { error: "organization_status_invalid" },
      { status: 400 }
    );
  }

  const { member, error: memberError } = await getOrganizationMember(memberId);

  if (memberError) {
    return NextResponse.json(
      { error: "organization_member_lookup_failed" },
      { status: 400 }
    );
  }

  if (!member || member.organization_id !== organizationContext.organizationId) {
    return NextResponse.json(
      { error: "organization_member_not_found" },
      { status: 404 }
    );
  }

  const nextRole = role ?? member.role;
  const nextStatus = status ?? member.status;

  if (member.role === "admin" && member.status === "active") {
    const removingAdminAccess =
      nextRole !== "admin" || nextStatus !== "active";

    if (removingAdminAccess) {
      const { count, error } = await getActiveAdminCount(member.organization_id);

      if (error) {
        return NextResponse.json(
          { error: "organization_admin_count_failed" },
          { status: 400 }
        );
      }

      if (count <= 1) {
        return NextResponse.json(
          { error: "organization_last_admin_protected" },
          { status: 409 }
        );
      }
    }
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .update({
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id)
    .select("id, role, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "organization_member_update_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ member: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  const authenticatedUser = await requireAuth();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  if (organizationContext.organizationRole !== "admin") {
    return NextResponse.json(
      { error: "organization_admin_required" },
      { status: 403 }
    );
  }

  const { memberId } = await context.params;
  const { member, error: memberError } = await getOrganizationMember(memberId);

  if (memberError) {
    return NextResponse.json(
      { error: "organization_member_lookup_failed" },
      { status: 400 }
    );
  }

  if (!member || member.organization_id !== organizationContext.organizationId) {
    return NextResponse.json(
      { error: "organization_member_not_found" },
      { status: 404 }
    );
  }

  if (member.user_id === authenticatedUser.id) {
    return NextResponse.json(
      { error: "organization_member_self_remove_blocked" },
      { status: 409 }
    );
  }

  if (member.role === "admin" && member.status === "active") {
    const { count, error } = await getActiveAdminCount(member.organization_id);

    if (error) {
      return NextResponse.json(
        { error: "organization_admin_count_failed" },
        { status: 400 }
      );
    }

    if (count <= 1) {
      return NextResponse.json(
        { error: "organization_last_admin_protected" },
        { status: 409 }
      );
    }
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", member.id);

  if (error) {
    return NextResponse.json(
      { error: "organization_member_delete_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
