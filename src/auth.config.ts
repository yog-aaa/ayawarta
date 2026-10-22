import type { NextAuthConfig } from "next-auth";
import type { AdminRole } from "@/features/auth/types";

/**
 * Pure route authorization decision helper.
 * - /admin/login is ALWAYS allowed at the proxy/edge level to avoid redirect loops for stale/revoked sessions.
 * - /admin and /admin/* require an active session (unauthenticated requests are denied).
 * - Non-admin routes pass through.
 */
export function checkRouteAuthorization(
  pathname: string,
  isLoggedIn: boolean
): boolean {
  if (pathname === "/admin/login") {
    return true;
  }

  if (pathname.startsWith("/admin")) {
    return isLoggedIn;
  }

  return true;
}

export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      return checkRouteAuthorization(nextUrl.pathname, isLoggedIn);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: AdminRole }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AdminRole;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
