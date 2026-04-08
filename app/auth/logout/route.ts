import { NextResponse } from "next/server";
import { authCookieNames, authCookieOptions } from "../../../lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);

  response.cookies.delete({
    name: authCookieNames.accessToken,
    ...authCookieOptions,
  });
  response.cookies.delete({
    name: authCookieNames.refreshToken,
    ...authCookieOptions,
  });

  return response;
}
