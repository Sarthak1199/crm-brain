import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Deliberately not the `auth((req) => {...})` HOC from "@/auth" — that
// wrapper routes every intercepted request through Auth.js's own action
// dispatcher, and versions of next-auth v5 beta have a recurring bug where
// that dispatcher can't parse a plain page path (e.g. "/") as a known
// action and throws "UnknownAction: Cannot parse action at /". getToken()
// only decodes the session JWT from cookies — no action dispatch involved.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");

  // Auth.js prefixes the session cookie with "__Secure-" whenever it sets
  // it over HTTPS (production). getToken() defaults secureCookie to false
  // and won't look for that prefix unless told to — so in prod it was
  // always missing the real cookie, always seeing isLoggedIn === false,
  // and bouncing every authenticated request straight back to /login with
  // no visible error (a silent redirect loop, not a crash).
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });
  const isLoggedIn = !!token;

  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
