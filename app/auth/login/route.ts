import { NextResponse } from "next/server";
import {
  createAuthClientForRoute,
} from "../../../lib/auth";
import { setAuthCookies } from "../../../lib/auth-cookies";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectUrl = new URL("/painel", request.url);

  if (!email || !password) {
    return NextResponse.redirect(
      new URL("/login?error=missing", request.url),
      303
    );
  }

  const supabase = createAuthClientForRoute();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.redirect(
      new URL("/login?error=invalid", request.url),
      303
    );
  }

  const response = NextResponse.redirect(redirectUrl, 303);

  setAuthCookies(response, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    accessTokenMaxAge: data.session.expires_in,
  });

  return response;
}
