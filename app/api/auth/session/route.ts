import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireAuth } from "../../../../lib/auth";
import { authCookieNames } from "../../../../lib/auth-cookies";

export async function GET() {
  await requireAuth();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;
  const refreshToken = cookieStore.get(authCookieNames.refreshToken)?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  return NextResponse.json({
    accessToken,
    refreshToken,
  });
}
