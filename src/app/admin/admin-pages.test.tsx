import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AdminInvitationListResult } from "@/features/admin/invitation-list";

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  getAdminInvitationList: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
}));

vi.mock("@/features/auth/service", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));
vi.mock("@/features/admin/invitation-list", () => ({
  getAdminInvitationList: mocks.getAdminInvitationList,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => children,
}));

import AdminDashboardPage from "./page";
import AdminInvitationsPage from "./invitations/page";

const list: AdminInvitationListResult = {
  items: [{
    id: "inv-1",
    slug: "dudi-aini",
    coupleName: "Dudi & Aini",
    theme: "classic-rose",
    variant: "red",
    weddingDate: "2026-11-10T00:00:00.000Z",
    updatedAt: "2026-10-29T14:00:00.000Z",
  }],
  total: 25,
  page: 2,
  pageSize: 12,
  pageCount: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminSession.mockResolvedValue({ name: "Administrator" });
  mocks.getAdminInvitationList.mockResolvedValue(list);
});

describe("admin server pages", () => {
  it("redirects before reading invitations when the session is invalid", async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error("Forbidden"));

    await expect(AdminDashboardPage()).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.getAdminInvitationList).not.toHaveBeenCalled();

    await expect(
      AdminInvitationsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.getAdminInvitationList).not.toHaveBeenCalled();
  });

  it("uses the real read-model total and rows on the overview", async () => {
    const html = renderToStaticMarkup(await AdminDashboardPage());

    expect(mocks.getAdminInvitationList).toHaveBeenCalledWith({ page: 1 });
    expect(html).toContain("25");
    expect(html).toContain("Dudi &amp; Aini");
    expect(html).toContain('href="/admin/invitations"');
    expect(html).not.toContain("Pendapatan");
  });

  it("passes GET search and page to the read model and preserves query in pagination", async () => {
    const html = renderToStaticMarkup(
      await AdminInvitationsPage({
        searchParams: Promise.resolve({ q: "  Dudi  ", page: "2" }),
      })
    );

    expect(mocks.getAdminInvitationList).toHaveBeenCalledWith({ q: "Dudi", page: 2 });
    expect(html).toContain('name="q"');
    expect(html).toContain('href="/admin/invitations?q=Dudi"');
    expect(html).toContain('href="/admin/invitations?q=Dudi&amp;page=3"');
    expect(html).toContain("Halaman");
  });

  it("shows a generic retry state when the read model fails", async () => {
    mocks.getAdminInvitationList.mockRejectedValue(new Error("provider detail"));
    const html = renderToStaticMarkup(await AdminDashboardPage());

    expect(html).toContain("Daftar undangan belum dapat dimuat");
    expect(html).not.toContain("provider detail");
    expect(html).not.toContain("Undangan tersimpan");
  });

  it("redirects if authorization is revoked between page load and list read", async () => {
    mocks.getAdminInvitationList.mockRejectedValue(new Error("Forbidden"));

    await expect(AdminDashboardPage()).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.requireAdminSession).toHaveBeenCalledTimes(1);
  });

  it("shows a retry state instead of login when the auth database is unavailable", async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error("Database unavailable"));

    const overview = renderToStaticMarkup(await AdminDashboardPage());
    const invitations = renderToStaticMarkup(
      await AdminInvitationsPage({ searchParams: Promise.resolve({}) })
    );

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.getAdminInvitationList).not.toHaveBeenCalled();
    expect(overview).toContain("Panel administrator belum dapat dimuat");
    expect(invitations).toContain("Panel administrator belum dapat dimuat");
    expect(overview).not.toContain("Database unavailable");
  });
});
