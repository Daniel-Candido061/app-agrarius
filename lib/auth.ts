import "server-only";

import { redirect } from "next/navigation";
import {
  createSupabaseAuthClient,
  getResolvedServerAuthSession,
} from "./auth-session";

export async function getAuthenticatedUser() {
  const session = await getResolvedServerAuthSession();
  return session.user;
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
