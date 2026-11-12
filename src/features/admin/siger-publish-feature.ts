import "server-only";

import type { InvitationTheme } from "@/features/invitations/types";

type SigerPublishEnvironment = {
  [key: string]: string | undefined;
  AYAWARTA_SIGER_PUBLISH?: string;
  DATABASE_URL?: string;
  DATABASE_URL_POOLED?: string;
  VERCEL_ENV?: string;
  AYAWARTA_DEPLOYMENT_TARGET?: string;
};

/** The Siger publish switch is limited to the disposable local integration database. */
function isExactDisposableDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["postgres:", "postgresql:"].includes(parsed.protocol) &&
      parsed.hostname === "127.0.0.1" && parsed.port === "55436" &&
      parsed.pathname === "/ayawarta_siger" && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
}

export function isSigerPublishEnabled(env: SigerPublishEnvironment = process.env): boolean {
  return env.AYAWARTA_SIGER_PUBLISH === "enabled" &&
    env.VERCEL_ENV !== "production" &&
    env.AYAWARTA_DEPLOYMENT_TARGET !== "production" &&
    isExactDisposableDatabase(env.DATABASE_URL) &&
    isExactDisposableDatabase(env.DATABASE_URL_POOLED);
}

export function enabledPublishThemes(env: SigerPublishEnvironment = process.env): readonly InvitationTheme[] {
  return isSigerPublishEnabled(env) ? ["classic-rose", "siger-priangan"] : ["classic-rose"];
}
