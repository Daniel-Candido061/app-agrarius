"use client";

import { useEffect } from "react";

import { supabase } from "../../lib/supabase";

export function SupabaseSessionBridge() {
  useEffect(() => {
    let isMounted = true;

    async function syncSession() {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok || !isMounted) {
        return;
      }

      const payload = (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
      };

      if (!payload.accessToken || !payload.refreshToken) {
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
