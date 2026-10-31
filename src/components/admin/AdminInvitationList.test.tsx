import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AdminInvitationSummary } from "@/features/admin/invitation-list";
import { AdminInvitationList } from "./AdminInvitationList";
import { AdminListError } from "./AdminListError";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const invitation: AdminInvitationSummary = {
  id: "inv-1",
  slug: "dudi-aini",
  coupleName: "Dudi & Aini",
  theme: "classic-rose",
  variant: "red",
  // 00:30 in Jakarta; UTC formatting would incorrectly show 9 November.
  weddingDate: "2026-11-09T17:30:00.000Z",
  updatedAt: "2026-10-29T14:00:00.000Z",
};

describe("admin invitation presentation", () => {
  it("renders real invitation details in mobile cards and a semantic desktop table", () => {
    const html = renderToStaticMarkup(<AdminInvitationList items={[invitation]} />);

    expect(html).toContain("<table");
    expect(html).toContain('scope="col"');
    expect(html).toContain("Dudi &amp; Aini");
    expect(html).toContain("classic-rose");
    expect(html).toContain("10 Nov 2026");
    expect(html).toContain('href="/dudi-aini"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("Pendapatan");
  });

  it("encodes a slug as one URL path segment", () => {
    const html = renderToStaticMarkup(
      <AdminInvitationList items={[{ ...invitation, slug: "a/b?c" }]} />
    );

    expect(html).toContain('href="/a%2Fb%3Fc"');
    expect(html).not.toContain('href="/a/b?c"');
  });

  it("distinguishes synchronized retained drafts from unpublished changes", () => {
    const synced = renderToStaticMarkup(<AdminInvitationList items={[invitation]} showEditorActions linkedDrafts={{ "inv-1": { draftId: "draft-1", hasUnpublishedChanges: false } }} />);
    const changed = renderToStaticMarkup(<AdminInvitationList items={[invitation]} showEditorActions linkedDrafts={{ "inv-1": { draftId: "draft-1", hasUnpublishedChanges: true } }} />);

    expect(synced).toContain("Draf sinkron");
    expect(synced).not.toContain("Draf belum terbit");
    expect(changed).toContain("Draf belum terbit");
    expect(changed).not.toContain("Draf sinkron");
    expect(synced).toContain('href="/admin/invitations/draft-1/edit"');
    expect(changed).toContain('href="/admin/invitations/draft-1/edit"');
  });

  it("distinguishes an empty database from an empty search result", () => {
    const empty = renderToStaticMarkup(<AdminInvitationList items={[]} />);
    const filtered = renderToStaticMarkup(
      <AdminInvitationList items={[]} searchQuery="tidak ada" />
    );

    expect(empty).toContain("Belum ada undangan");
    expect(filtered).toContain("Tidak ada undangan yang cocok");
    expect(filtered).toContain("hapus pencarian");
    expect(empty).not.toContain("Buat draf");
  });

  it("keeps list failures generic and provides a retry destination", () => {
    const html = renderToStaticMarkup(
      <AdminListError retryHref="/admin/invitations?q=dudi" />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Daftar undangan belum dapat dimuat");
    expect(html).toContain('href="/admin/invitations?q=dudi"');
    expect(html).not.toContain("DATABASE_URL");
  });
});
