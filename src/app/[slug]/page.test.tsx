import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { sigerPrianganSample } from "@/features/invitations/siger-priangan-sample";

const mocks = vi.hoisted(() => ({ findBySlug: vi.fn() }));
vi.mock("@/features/invitations/repository", () => ({ invitationRepository: { findBySlug: mocks.findBySlug } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("../(templates)/wedding/siger-priangan/[variant]/components/SigerPrianganView", () => ({
  default: ({ guestName, invitationSlug }: { guestName?: string; invitationSlug: string }) => <p>Siger {invitationSlug} {guestName}</p>,
}));
vi.mock("../(templates)/wedding/classic-rose/[variant]/components/ClassicRoseClientView", () => ({
  default: ({ invitationSlug }: { invitationSlug: string }) => <p>Classic {invitationSlug}</p>,
}));

import InvitationPage from "./page";

beforeEach(() => mocks.findBySlug.mockReset());

describe("public invitation theme dispatch", () => {
  it("renders the Siger theme for a persisted matching invitation", async () => {
    mocks.findBySlug.mockResolvedValue(sigerPrianganSample.invitation);
    const html = renderToStaticMarkup(await InvitationPage({ params: Promise.resolve({ slug: "sample" }), searchParams: Promise.resolve({ to: "Tamu Aya" }) }));
    expect(html).toContain("Siger sample Tamu Aya");
    expect(mocks.findBySlug).toHaveBeenCalledWith("sample");
  });

  it("retains Classic Rose dispatch and exact unknown-slug 404", async () => {
    mocks.findBySlug.mockResolvedValueOnce({ ...sigerPrianganSample.invitation, meta: { theme: "classic-rose", variant: "red" } });
    const html = renderToStaticMarkup(await InvitationPage({ params: Promise.resolve({ slug: "classic" }) }));
    expect(html).toContain("Classic classic");
    mocks.findBySlug.mockResolvedValueOnce(null);
    await expect(InvitationPage({ params: Promise.resolve({ slug: "missing" }) })).rejects.toThrow("NOT_FOUND");
  });
});
