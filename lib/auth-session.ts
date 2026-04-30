import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import {
  createClient,
  type Session,
  type User,
} from "@supabase/supabase-js";

import { authCookieNames } from "./auth-cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type ResolvedServerAuthSession = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  refreshedSession: Session | null;
  accessTokenMaxAge: number | null;
};

export function createSupabaseAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getResolvedServerAuthSession = cache(
  async (): Promise<ResolvedServerAuthSession> => {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(authCookieNames.accessToken)?.value ?? null;
    const refreshToken =
      cookieStore.get(authCookieNames.refreshToken)?.value ?? null;

    if (!accessToken && !refreshToken) {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        refreshedSession: null,
        accessTokenMaxAge: null,
      };
    }

    const supabase = createSupabaseAuthClient();

    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);

      if (!error && data.user) {
        return {
          user: data.user,
          accessToken,
          refreshToken,
          refreshedSession: null,
          accessTokenMaxAge: null,
        };
      }
    }

    if (refreshToken) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (!error && data.session && data.user) {
        return {
          user: data.user,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token ?? refreshToken,
          refreshedSession: data.session,
          accessTokenMaxAge: data.session.expires_in ?? null,
        };
      }
    }

    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      refreshedSession: null,
      accessTokenMaxAge: null,
    };
  }
);
