import type { NextResponse } from "next/server";

export const authCookieNames = {
  accessToken: "agrarius-access-token",
  refreshToken: "agrarius-refresh-token",
};

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

type CookieResponse = Pick<NextResponse, "cookies">;

export function setAuthCookies(
  response: CookieResponse,
  params: {
    accessToken: string;
    refreshToken: string;
    accessTokenMaxAge?: number;
    refreshTokenMaxAge?: number;
  }
) {
  const {
    accessToken,
    refreshToken,
    accessTokenMaxAge,
    refreshTokenMaxAge = 60 * 60 * 24 * 30,
  } = params;

  response.cookies.set(authCookieNames.accessToken, accessToken, {
    ...authCookieOptions,
    ...(typeof accessTokenMaxAge === "number" ? { maxAge: accessTokenMaxAge } : {}),
  });
  response.cookies.set(authCookieNames.refreshToken, refreshToken, {
    ...authCookieOptions,
    maxAge: refreshTokenMaxAge,
  });
}

export function clearAuthCookies(response: CookieResponse) {
  response.cookies.delete({
    name: authCookieNames.accessToken,
    ...authCookieOptions,
  });
  response.cookies.delete({
    name: authCookieNames.refreshToken,
    ...authCookieOptions,
  });
}
