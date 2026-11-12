import "server-only";

import {
  invitationDetailInclude,
  publicInvitationSelect,
  type InvitationDetailPayload,
  type PublicInvitationDetailPayload,
} from "./query";
import { mapPrismaToInvitation } from "./mapper";
import type { Invitation } from "./types";

export interface InvitationDatabaseClient {
  invitation: {
    findUnique(args: {
      where: { slug: string };
      select: typeof publicInvitationSelect;
    }): Promise<PublicInvitationDetailPayload | null>;
  };
}

type FullInvitationReadClient = {
  invitation: {
    findUnique(args: {
      where: { slug: string };
      include: typeof invitationDetailInclude;
    }): Promise<InvitationDetailPayload | null>;
  };
};

let defaultClient: InvitationDatabaseClient | null = null;

async function getDefaultClient(): Promise<InvitationDatabaseClient> {
  if (!defaultClient) {
    const { prisma } = await import("@/lib/server/db");
    defaultClient = prisma;
  }
  return defaultClient;
}

export function createInvitationRepository(
  customDb?: InvitationDatabaseClient
) {
  return {
    async findPayloadBySlug(
      slug: string
    ): Promise<PublicInvitationDetailPayload | InvitationDetailPayload | null> {
      if (!slug || typeof slug !== "string") {
        return null;
      }
      const db = customDb ?? (await getDefaultClient());
      const legacy = await db.invitation.findUnique({
        where: { slug },
        select: publicInvitationSelect,
      });
      if (!legacy || legacy.theme !== "siger-priangan") return legacy;

      // A Siger row can only be published against the migrated schema. Read
      // its authored greeting, prayer and gallery captions while Classic Rose
      // retains its established public selection.
      const full = await (db as InvitationDatabaseClient & FullInvitationReadClient).invitation.findUnique({
        where: { slug }, include: invitationDetailInclude,
      });
      return full?.id === legacy.id && full.theme === "siger-priangan" ? full : null;
    },

    async findBySlug(slug: string): Promise<Invitation | null> {
      const payload = await this.findPayloadBySlug(slug);
      if (!payload) {
        return null;
      }
      return mapPrismaToInvitation(payload);
    },
  };
}

export const invitationRepository = createInvitationRepository();
export type InvitationRepository = ReturnType<typeof createInvitationRepository>;
