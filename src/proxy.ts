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
  const isResetPasswordRoute = pathname.startsWith("/reset-password");

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

  // Accounts created with a generated temp password carry this flag until
  // they set their own — block every route but the reset page itself
  // (and logout) so a temp password can't be used to browse the app.
  if (isLoggedIn && token?.mustResetPassword && !isResetPasswordRoute) {
    return NextResponse.redirect(new URL("/reset-password", request.nextUrl));
  }
  if (isLoggedIn && !token?.mustResetPassword && isResetPasswordRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }
}

// api/cron/* authenticates via a Bearer CRON_SECRET header, not a session
// cookie — Vercel's actual cron invocations carry no cookie at all, so
// without this exclusion every cron hit was silently 307-redirected to
// /login by the block above before it ever reached the route's own
// isAuthorized() check. The daily 9AM sync never actually ran because of
// this, regardless of anything in the sync logic itself. api/admin/sync is
// excluded too — it does its own session + role check inside the handler
// (see src/app/api/admin/sync/route.ts), so gating it here a second time is
// redundant and, for a plain fetch/curl caller with no cookie, would have
// the same silent-redirect problem.
export const config = {
  matcher: ["/((?!api/auth|api/cron|api/admin|_next/static|_next/image|favicon.ico).*)"],
};
