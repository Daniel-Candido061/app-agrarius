import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { requireAuth } from "../../../../lib/auth";
import { authCookieNames } from "../../../../lib/auth-cookies";

function createAuthorizedSupabaseClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

export async function POST(request: Request) {
  const authenticatedUser = await requireAuth();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

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

  const supabase = createAuthorizedSupabaseClient(accessToken);
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
