import "server-only";

import { CANONICAL_TARGET_CLOUD_NAME } from "@/features/media/canonical-catalog";

export class A5UnavailableError extends Error {
  constructor() { super("Penyediaan media undangan baru belum diaktifkan."); this.name = "A5UnavailableError"; }
}

type A5Environment = {
  AYAWARTA_A5_MEDIA?: string;
  AYAWARTA_A5_APPROVED_CLOUD?: string;
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
};

export function isA5Enabled(env: A5Environment = process.env as A5Environment): boolean {
  return env.AYAWARTA_A5_MEDIA === "enabled" &&
    env.AYAWARTA_A5_APPROVED_CLOUD === CANONICAL_TARGET_CLOUD_NAME &&
    env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME === CANONICAL_TARGET_CLOUD_NAME;
}

export function requireA5Enabled(env: A5Environment = process.env as A5Environment): void {
  if (!isA5Enabled(env)) throw new A5UnavailableError();
}
