import "server-only";

import { publicInvitationSelect, type PublicInvitationDetailPayload } from "./query";
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
    ): Promise<PublicInvitationDetailPayload | null> {
      if (!slug || typeof slug !== "string") {
        return null;
      }
      const db = customDb ?? (await getDefaultClient());
      return db.invitation.findUnique({
        where: { slug },
        select: publicInvitationSelect,
      });
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
