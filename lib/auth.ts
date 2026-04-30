import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { authCookieNames, authCookieOptions } from "./auth-cookies";

function createSupabaseAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;

  if (!accessToken) {
    return null;
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireAuth() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export function createAuthClientForRoute() {
  return createSupabaseAuthClient();
}
