import "server-only";

import { invitationDetailInclude, type InvitationDetailPayload } from "./query";
import { mapPrismaToInvitation } from "./mapper";
import type { Invitation } from "./types";

export interface InvitationDatabaseClient {
  invitation: {
    findUnique(args: {
      where: { slug: string };
      include: typeof invitationDetailInclude;
    }): Promise<InvitationDetailPayload | null>;
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
    ): Promise<InvitationDetailPayload | null> {
      if (!slug || typeof slug !== "string") {
        return null;
      }
      const db = customDb ?? (await getDefaultClient());
      return db.invitation.findUnique({
        where: { slug },
        include: invitationDetailInclude,
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
