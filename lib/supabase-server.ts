import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { authCookieNames } from "./auth-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
