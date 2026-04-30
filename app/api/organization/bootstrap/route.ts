import { NextResponse } from "next/server";

import { requireAuth } from "../../../../lib/auth";
import { getSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  const authenticatedUser = await requireAuth();

  const body = (await request.json().catch(() => null)) as
    | { organizationName?: string }
    | null;
  const organizationName = body?.organizationName?.trim() ?? "";

  if (!organizationName) {
    return NextResponse.json(
      { error: "organization_name_required" },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("bootstrap_organization", {
    organization_name: organizationName,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message || "organization_bootstrap_failed",
        details: error.details,
        hint: error.hint,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data,
    userId: authenticatedUser.id,
  });
}
