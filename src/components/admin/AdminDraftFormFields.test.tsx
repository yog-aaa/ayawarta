// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createEmptyDraftPayload, type DraftPayloadV1 } from "@/features/admin/draft-schema";

// @ts-expect-error React 19 act test flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...props} />
  ),
}));

import { AdminDraftFormFields, type AdminEditorMediaChoice } from "./AdminDraftFormFields";

function changeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = element instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("admin draft fields", () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: DraftPayloadV1;

  function renderEditor(initial: DraftPayloadV1, choices: AdminEditorMediaChoice[] = []) {
    function Harness() {
      const [payload, setPayload] = useState(initial);
      latest = payload;
      return <AdminDraftFormFields payload={payload} onChange={setPayload} errors={{ "events.0.name": ["Nama wajib diisi."] }} mediaChoices={choices} slugLocked={false} disabled={false} />;
    }
    act(() => root.render(<Harness />));
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("keeps Jakarta event time and exposes field errors to its control", () => {
    const initial = createEmptyDraftPayload();
    initial.weddingDate = "2026-11-09T17:30:00.000Z";
    initial.events = [{ key: "event-1", name: "Akad", displayDate: "", displayTime: "", location: "", address: "", mapUrl: "" }];
    renderEditor(initial);

    const date = container.querySelector<HTMLInputElement>("#draft-weddingDate")!;
    expect(date.value).toBe("2026-11-10T00:30");
    const name = container.querySelector<HTMLInputElement>("#draft-events-0-name")!;
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toContain("draft-events-0-name-error");

    act(() => changeValue(date, "2026-11-10T08:00"));
    expect(latest.weddingDate).toBe("2026-11-10T08:00:00+07:00");
  });

  it("adds, reorders and removes rows with keyboard-addressable controls", () => {
    renderEditor(createEmptyDraftPayload());
    const add = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Tambah acara"))!;
    act(() => add.click());
    act(() => add.click());
    expect(latest.events).toHaveLength(2);
    act(() => changeValue(container.querySelector<HTMLInputElement>("#draft-events-0-name")!, "Akad"));
    act(() => changeValue(container.querySelector<HTMLInputElement>("#draft-events-1-name")!, "Resepsi"));

    act(() => (container.querySelector('button[aria-label="Naikkan acara 2"]') as HTMLButtonElement).click());
    expect(latest.events.map((event) => event.name)).toEqual(["Resepsi", "Akad"]);
    act(() => (container.querySelector('button[aria-label="Hapus acara 1"]') as HTMLButtonElement).click());
    expect(latest.events.map((event) => event.name)).toEqual(["Akad"]);
  });

  it("blocks selecting shared media for a different field", () => {
    const initial = createEmptyDraftPayload();
    initial.heroAssetId = "shared-image";
    renderEditor(initial, [
      { id: "shared-image", url: "https://res.cloudinary.com/example/image.jpg", resourceType: "IMAGE", width: 800, height: 1000, label: "Foto lama", selectable: false },
      { id: "own-image", url: "https://res.cloudinary.com/example/own.jpg", resourceType: "IMAGE", width: 800, height: 1000, label: "Foto sendiri", selectable: true },
    ]);

    const hero = container.querySelector<HTMLSelectElement>("#draft-heroAssetId")!;
    const groom = container.querySelector<HTMLSelectElement>("#draft-partners-groom-photoAssetId")!;
    expect(hero.querySelector<HTMLOptionElement>('option[value="shared-image"]')?.disabled).toBe(false);
    expect(groom.querySelector<HTMLOptionElement>('option[value="shared-image"]')?.disabled).toBe(true);
    expect(groom.querySelector<HTMLOptionElement>('option[value="own-image"]')?.disabled).toBe(false);
  });
});
