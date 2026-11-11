import { expect, it, vi } from "vitest";

vi.mock("sharp", () => {
  throw new Error("Native Sharp is unavailable");
});

it("loads the admin media service without loading native Sharp", async () => {
  await expect(import("./media-service")).resolves.toHaveProperty("recoverAdminDraftImage");
  await expect(import("@/app/admin/actions")).resolves.toHaveProperty("openPublishedInvitationDraftAction");
}, 20_000);
