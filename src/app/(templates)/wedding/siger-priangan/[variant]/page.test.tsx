import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("./components/SigerPrianganView", () => ({
  default: ({ isPreview, invitationSlug }: { isPreview: boolean; invitationSlug: string }) => <p>{isPreview ? "Preview" : "Live"} {invitationSlug}</p>,
}));

import SigerPrianganPage from "./page";

describe("Siger Priangan preview route", () => {
  it("accepts only the ivory variant and stays read-only", async () => {
    const html = renderToStaticMarkup(await SigerPrianganPage({ params: Promise.resolve({ variant: "ivory" }) }));
    expect(html).toContain("Preview siger-priangan-sample");
    await expect(SigerPrianganPage({ params: Promise.resolve({ variant: "red" }) })).rejects.toThrow("NOT_FOUND");
  });
});
