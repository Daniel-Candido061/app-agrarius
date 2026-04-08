import { NextResponse } from "next/server";
import {
  authCookieNames,
  authCookieOptions,
  createAuthClientForRoute,
} from "../../../lib/auth";

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

  response.cookies.set(
    authCookieNames.accessToken,
    data.session.access_token,
    {
      ...authCookieOptions,
      maxAge: data.session.expires_in,
    }
  );
  response.cookies.set(
    authCookieNames.refreshToken,
    data.session.refresh_token,
    {
      ...authCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    }
  );

  return response;
}
