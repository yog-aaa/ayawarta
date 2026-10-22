import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

export type AdminRole = "ADMIN" | "SUPER_ADMIN";

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AdminRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AdminRole;
  }
}
