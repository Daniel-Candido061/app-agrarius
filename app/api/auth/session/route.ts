import { NextResponse } from "next/server";

import { getResolvedServerAuthSession } from "../../../../lib/auth-session";
import { setAuthCookies } from "../../../../lib/auth-cookies";

export async function GET() {
  const resolvedSession = await getResolvedServerAuthSession();
  const { accessToken, refreshToken, refreshedSession, accessTokenMaxAge, user } =
    resolvedSession;

  if (!user || !accessToken || !refreshToken) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const response = NextResponse.json({
    accessToken,
    refreshToken,
  });

  if (refreshedSession) {
    setAuthCookies(response, {
      accessToken,
      refreshToken,
      accessTokenMaxAge: accessTokenMaxAge ?? undefined,
    });
  }

  return response;
}
