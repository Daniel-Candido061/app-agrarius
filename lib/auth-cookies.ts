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
