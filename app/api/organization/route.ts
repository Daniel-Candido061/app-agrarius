import { NextResponse } from "next/server";

import { requireAuth } from "../../../lib/auth";
import { requireCurrentOrganization } from "../../../lib/organization-context";
import { getSupabaseServerClient } from "../../../lib/supabase-server";

export async function PATCH(request: Request) {
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

  const body = (await request.json().catch(() => null)) as
    | { name?: string }
    | null;
  const normalizedName = body?.name?.trim() ?? "";

  if (!normalizedName) {
    return NextResponse.json(
      { error: "organization_name_required" },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: normalizedName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationContext.organizationId)
    .select("id, name")
    .maybeSingle();

  if (error) {
    const errorCode =
      error.code === "23505"
        ? "organization_name_conflict"
        : "organization_update_failed";

    return NextResponse.json(
      { error: errorCode, details: error.message },
      { status: error.code === "23505" ? 409 : 400 }
    );
  }

  return NextResponse.json({ organization: data });
}
