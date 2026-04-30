"use client";

import { useEffect } from "react";

import { supabase } from "../../lib/supabase";

export function SupabaseSessionBridge() {
  useEffect(() => {
    let isMounted = true;

    async function syncSession() {
      let response: Response;

      try {
        response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        return;
      }

      if (!isMounted) {
        return;
      }

      if (response.status === 401) {
        await supabase.auth.signOut();
        return;
      }

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };

      if (!payload.accessToken || !payload.refreshToken) {
        await supabase.auth.signOut();
        return;
      }

      await supabase.auth.setSession({
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken,
      });
    }

    syncSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
