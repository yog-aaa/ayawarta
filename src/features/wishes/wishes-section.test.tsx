// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// FIRE-02: Hoisted fail-closed mocks for firebase/app and firebase/firestore
const {
  mockInitializeApp,
  mockGetApps,
  mockGetFirestore,
  mockCollection,
  mockQuery,
  mockOrderBy,
  mockOnSnapshot,
  mockAddDoc,
} = vi.hoisted(() => ({
  mockInitializeApp: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/app initializeApp call.");
  }),
  mockGetApps: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/app getApps call.");
  }),
  mockGetFirestore: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/firestore getFirestore call.");
  }),
  mockCollection: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/firestore collection call.");
  }),
  mockQuery: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/firestore query call.");
  }),
  mockOrderBy: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/firestore orderBy call.");
  }),
  mockOnSnapshot: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/firestore onSnapshot call.");
  }),
  mockAddDoc: vi.fn(() => {
    throw new Error("FAIL-CLOSED: Unexpected live firebase/firestore addDoc call.");
  }),
}));

vi.mock("firebase/app", () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: mockGetFirestore,
  collection: mockCollection,
  query: mockQuery,
  orderBy: mockOrderBy,
  onSnapshot: mockOnSnapshot,
  addDoc: mockAddDoc,
}));

import WishesSection from "@/app/(templates)/wedding/classic-rose/[variant]/components/WishesSection";
import {
  FakeWishesGateway,
  ControllableWishesGateway,
} from "./testing/fake-wishes-gateway";
import {
  getClassicRoseThemeConfig,
  type ClassicRoseThemeConfig as ThemeConfig,
} from "@/lib/theme-config/classic-rose";
import type { Wish } from "./types";

const STRIP_PROPS = new Set([
  "whileInView",
  "initial",
  "animate",
  "exit",
  "transition",
  "viewport",
  "variants",
  "fill",
  "priority",
]);

function cleanDomProps(
  props: Record<string, unknown>
): React.HTMLAttributes<HTMLElement> {
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!STRIP_PROPS.has(key)) {
      clean[key] = props[key];
    }
  }
  return clean as React.HTMLAttributes<HTMLElement>;
}

// Mock next/image to render standard img tag without Next.js custom props leaking to DOM
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...cleanDomProps(props as unknown as Record<string, unknown>)}
      alt={props.alt || ""}
    />
  ),
}));

// Mock framer-motion to avoid Happy-DOM Web Animation API cancelation errors on unmount
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({
        children,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...cleanDomProps(props)}>{children}</div>
      ),
      form: ({
        children,
        ...props
      }: React.FormHTMLAttributes<HTMLFormElement> & Record<string, unknown>) => (
        <form {...cleanDomProps(props)}>{children}</form>
      ),
    },
  };
});

function changeInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const proto =
    element instanceof HTMLInputElement
      ? window.HTMLInputElement.prototype
      : window.HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

const mockTheme: ThemeConfig = getClassicRoseThemeConfig("red");

describe("WishesSection Component", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = "";
    (
      globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("proves fail-closed Firebase SDK spies have zero calls during component tests (FIRE-02)", async () => {
    const fakeGateway = new FakeWishesGateway({ "rika-fauzi": [] });

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    // None of the real SDK methods should have been touched
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockGetApps).not.toHaveBeenCalled();
    expect(mockGetFirestore).not.toHaveBeenCalled();
    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockOrderBy).not.toHaveBeenCalled();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("renders loading state initially on mount", async () => {
    const fakeGateway = new FakeWishesGateway();
    fakeGateway.autoEmitInitial = false; // keep in loading state until explicitly emitted

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.textContent).toContain("Memuat ucapan");
  });

  it("renders empty state when subscription snapshot has no wishes and skippedCount is 0", async () => {
    const fakeGateway = new FakeWishesGateway({ "rika-fauzi": [] });

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    // Wait for microtask delivery
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const emptyText = container.textContent;
    expect(emptyText).toContain("Belum ada ucapan.");
    expect(emptyText).toContain(
      "Jadilah yang pertama memberikan doa dan ucapan"
    );
  });

  it("renders nonfatal generic warning when skippedCount > 0, preserves valid siblings, and cleans warning on clean snapshot (FIRE-01)", async () => {
    const validWish: Wish = {
      id: "w-valid-1",
      name: "Ahmad",
      message: "Selamat ya!",
      attendance: "Hadir",
      timestamp: new Date("2026-06-15T10:00:00Z"),
    };

    const fakeGateway = new FakeWishesGateway(
      { "rika-fauzi": [validWish] },
      { "rika-fauzi": 2 } // 2 malformed records skipped
    );

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Valid sibling is rendered
    expect(container.textContent).toContain("Ahmad");
    expect(container.textContent).toContain("Selamat ya!");

    // Nonfatal generic warning is displayed in status/polite region
    expect(container.textContent).toContain(
      "Beberapa ucapan tidak dapat ditampilkan karena format data tidak sesuai."
    );

    // Empty state is NOT rendered
    expect(container.textContent).not.toContain("Belum ada ucapan.");

    // Now emit clean snapshot with skippedCount = 0
    await act(async () => {
      fakeGateway.setWishes("rika-fauzi", [validWish], 0);
    });

    // Warning is cleanly removed
    expect(container.textContent).not.toContain(
      "Beberapa ucapan tidak dapat ditampilkan karena format data tidak sesuai."
    );
  });

  it("does not render empty state when all records are malformed (FIRE-01)", async () => {
    // 0 valid wishes, but 3 skipped malformed documents
    const fakeGateway = new FakeWishesGateway(
      { "rika-fauzi": [] },
      { "rika-fauzi": 3 }
    );

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Must show the warning banner
    expect(container.textContent).toContain(
      "Beberapa ucapan tidak dapat ditampilkan karena format data tidak sesuai."
    );
    // Must NOT show false "Belum ada ucapan." empty state
    expect(container.textContent).not.toContain("Belum ada ucapan.");
  });

  it("renders real-time wishes with Hadir, Tidak Hadir, and Belum Konfirmasi badges", async () => {
    const initialWishes: Wish[] = [
      {
        id: "w-1",
        name: "Ahmad Fauzi",
        message: "Selamat ya!",
        attendance: "Hadir",
        timestamp: new Date("2026-06-15T10:00:00Z"),
      },
      {
        id: "w-2",
        name: "Siti Rahma",
        message: "Maaf tidak bisa hadir.",
        attendance: "Tidak Hadir",
        timestamp: new Date("2026-06-15T11:00:00Z"),
      },
      {
        id: "w-3",
        name: "Tamu Netral",
        message: "Sukses selalu.",
        attendance: "Belum Konfirmasi",
        timestamp: new Date("2026-06-15T12:00:00Z"),
      },
    ];

    const fakeGateway = new FakeWishesGateway({ "rika-fauzi": initialWishes });

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(container.textContent).toContain("Ahmad Fauzi");
    expect(container.textContent).toContain("Siti Rahma");
    expect(container.textContent).toContain("Tamu Netral");

    const badges = container.querySelectorAll("span.rounded-full");
    expect(badges.length).toBe(3);

    expect(badges[0].textContent).toBe("Hadir");
    expect(badges[0].className).toContain("bg-green-100");

    expect(badges[1].textContent).toBe("Tidak Hadir");
    expect(badges[1].className).toContain("bg-red-100");

    expect(badges[2].textContent).toBe("Belum Konfirmasi");
    expect(badges[2].className).toContain("bg-gray-100");
  });

  it("proves retry lifecycle, exact unsubscription counts, and stale callback rejection (FIRE-04)", async () => {
    const controllableGateway = new ControllableWishesGateway();

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="shidqi-mita"
          theme={mockTheme}
          gateway={controllableGateway}
        />
      );
    });

    // Subscription 0 created
    expect(controllableGateway.getTotalSubscriptions()).toBe(1);
    expect(controllableGateway.getActiveCount()).toBe(1);

    // Emit error on Sub 0
    await act(async () => {
      controllableGateway.emitError(0, new Error("Network offline"));
    });

    expect(container.textContent).toContain("Gagal memuat ucapan.");
    const retryBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Coba Lagi"
    );
    expect(retryBtn).not.toBeUndefined();

    // Click retry
    await act(async () => {
      retryBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Sub 0 unsubscribed exactly once; Sub 1 created; at most 1 active subscription
    const sub0 = controllableGateway.getSubscription(0);
    expect(sub0?.unsubscribeCount).toBe(1);
    expect(sub0?.active).toBe(false);
    expect(controllableGateway.getTotalSubscriptions()).toBe(2);
    expect(controllableGateway.getActiveCount()).toBe(1);

    // Returned to loading state
    expect(container.textContent).toContain("Memuat ucapan");

    // Stale emission from Sub 0 (data or error) must NOT affect UI
    await act(async () => {
      controllableGateway.emitData(0, {
        wishes: [
          {
            id: "ghost-1",
            name: "Ghost User",
            message: "Stale message",
            attendance: "Hadir",
            timestamp: new Date(),
          },
        ],
        skippedCount: 0,
      });
      controllableGateway.emitError(0, new Error("Stale error"));
    });

    // Still in loading state, ghost data not rendered, stale error not rendered
    expect(container.textContent).toContain("Memuat ucapan");
    expect(container.textContent).not.toContain("Ghost User");

    // Now emit valid data on active Sub 1
    await act(async () => {
      controllableGateway.emitData(1, {
        wishes: [
          {
            id: "fresh-1",
            name: "Fresh User",
            message: "Fresh message",
            attendance: "Hadir",
            timestamp: new Date(),
          },
        ],
        skippedCount: 0,
      });
    });

    expect(container.textContent).toContain("Fresh User");
    expect(container.textContent).not.toContain("Gagal memuat ucapan.");
  });

  it("proves slug change lifecycle: unsubs old slug exactly once and ignores stale callbacks (FIRE-04)", async () => {
    const controllableGateway = new ControllableWishesGateway();

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={controllableGateway}
        />
      );
    });

    expect(controllableGateway.getTotalSubscriptions()).toBe(1);
    expect(controllableGateway.getActiveCount()).toBe(1);

    // Switch slug to dudi-aini
    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="dudi-aini"
          theme={mockTheme}
          gateway={controllableGateway}
        />
      );
    });

    // Sub 0 ("rika-fauzi") unsubscribed exactly once; Sub 1 ("dudi-aini") created
    const sub0 = controllableGateway.getSubscription(0);
    expect(sub0?.slug).toBe("rika-fauzi");
    expect(sub0?.unsubscribeCount).toBe(1);
    expect(sub0?.active).toBe(false);

    const sub1 = controllableGateway.getSubscription(1);
    expect(sub1?.slug).toBe("dudi-aini");
    expect(sub1?.active).toBe(true);
    expect(controllableGateway.getActiveCount()).toBe(1);

    // Stale emission for rika-fauzi must not render on dudi-aini view
    await act(async () => {
      controllableGateway.emitData(0, {
        wishes: [
          {
            id: "rika-wish",
            name: "Rika Fan",
            message: "Hello Rika",
            attendance: "Hadir",
            timestamp: new Date(),
          },
        ],
        skippedCount: 0,
      });
    });

    expect(container.textContent).not.toContain("Rika Fan");

    // Active emission for dudi-aini renders correctly
    await act(async () => {
      controllableGateway.emitData(1, {
        wishes: [
          {
            id: "dudi-wish",
            name: "Dudi Fan",
            message: "Hello Dudi",
            attendance: "Hadir",
            timestamp: new Date(),
          },
        ],
        skippedCount: 0,
      });
    });

    expect(container.textContent).toContain("Dudi Fan");
  });

  it("proves 100% 1:1 subscribe-to-unsubscribe ratio on unmount and React Strict Mode probe (FIRE-04)", async () => {
    const controllableGateway = new ControllableWishesGateway();

    // Simulate mount -> unmount (as in Strict Mode probe)
    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={controllableGateway}
        />
      );
    });
    expect(controllableGateway.getActiveCount()).toBe(1);

    await act(async () => {
      root.unmount();
    });
    expect(controllableGateway.getActiveCount()).toBe(0);
    expect(controllableGateway.getTotalSubscriptions()).toBe(1);
    expect(controllableGateway.getTotalUnsubscribes()).toBe(1);

    // Re-mount root
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={controllableGateway}
        />
      );
    });
    expect(controllableGateway.getActiveCount()).toBe(1);
    expect(controllableGateway.getTotalSubscriptions()).toBe(2);

    await act(async () => {
      root.unmount();
    });
    expect(controllableGateway.getActiveCount()).toBe(0);
    expect(controllableGateway.getTotalSubscriptions()).toBe(2);
    expect(controllableGateway.getTotalUnsubscribes()).toBe(2);

    // Recreate root for afterEach
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("renders accessible success feedback and clears it upon user input/resubmit (FIRE-05)", async () => {
    const fakeGateway = new FakeWishesGateway({ "rika-fauzi": [] });

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    const nameInput = container.querySelector("#wishes-name") as HTMLInputElement;
    const msgInput = container.querySelector(
      "#wishes-message"
    ) as HTMLTextAreaElement;
    const submitBtn = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    const hadirBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Hadir"
    );

    // Fill and submit
    await act(async () => {
      changeInput(nameInput, "Citra");
      changeInput(msgInput, "Selamat menempuh hidup baru!");
      hadirBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      submitBtn.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });

    // Form reset on success
    expect(nameInput.value).toBe("");
    expect(msgInput.value).toBe("");
    expect(hadirBtn?.getAttribute("aria-checked")).toBe("false");

    // Success feedback rendered with role="status" and aria-live="polite"
    const successStatus = container.querySelector('[role="status"][aria-live="polite"]');
    expect(successStatus).not.toBeNull();
    expect(successStatus?.textContent).toContain("Ucapan berhasil dikirim.");

    // Editing name input clears the success feedback
    await act(async () => {
      changeInput(nameInput, "A");
    });
    expect(container.textContent).not.toContain("Ucapan berhasil dikirim.");

    // Re-fill and resubmit
    await act(async () => {
      changeInput(nameInput, "Citra Baru");
      changeInput(msgInput, "Semoga berbahagia!");
      hadirBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      submitBtn.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });

    expect(container.textContent).toContain("Ucapan berhasil dikirim.");

    // Clicking attendance also clears the success feedback
    await act(async () => {
      hadirBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).not.toContain("Ucapan berhasil dikirim.");
  });

  it("separates validation errors and applies aria-invalid/describedby only to affected controls (FIRE-06)", async () => {
    const fakeGateway = new FakeWishesGateway({ "rika-fauzi": [] });

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    const submitBtn = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    const nameInput = container.querySelector("#wishes-name") as HTMLInputElement;
    const msgInput = container.querySelector(
      "#wishes-message"
    ) as HTMLTextAreaElement;
    const radiogroup = container.querySelector('[role="radiogroup"]') as HTMLDivElement;
    const hadirBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Hadir"
    );

    // Initial state: no aria-invalid on any control
    expect(nameInput.getAttribute("aria-invalid")).toBeNull();
    expect(msgInput.getAttribute("aria-invalid")).toBeNull();
    expect(radiogroup.getAttribute("aria-invalid")).toBeNull();

    // 1. Submit empty form: both text fields and radiogroup are invalid
    await act(async () => {
      submitBtn.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });

    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
    expect(nameInput.getAttribute("aria-describedby")).toBe("wishes-name-error");
    expect(container.querySelector("#wishes-name-error")?.textContent).toContain(
      "Nama dan ucapan tidak boleh kosong."
    );

    expect(msgInput.getAttribute("aria-invalid")).toBe("true");
    expect(msgInput.getAttribute("aria-describedby")).toBe("wishes-message-error");
    expect(container.querySelector("#wishes-message-error")?.textContent).toContain(
      "Nama dan ucapan tidak boleh kosong."
    );

    expect(radiogroup.getAttribute("aria-invalid")).toBe("true");
    expect(radiogroup.getAttribute("aria-describedby")).toBe("wishes-attendance-error");
    expect(container.querySelector("#wishes-attendance-error")?.textContent).toContain(
      "Mohon pilih konfirmasi kehadiran Anda."
    );

    // 2. Fill valid name and message, but leave attendance unselected
    await act(async () => {
      changeInput(nameInput, "Hendra");
      changeInput(msgInput, "Selamat menempuh hidup baru!");
    });

    await act(async () => {
      submitBtn.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });

    // Valid text fields must NOT be marked invalid
    expect(nameInput.getAttribute("aria-invalid")).toBeNull();
    expect(nameInput.getAttribute("aria-describedby")).toBeNull();
    expect(container.querySelector("#wishes-name-error")).toBeNull();

    expect(msgInput.getAttribute("aria-invalid")).toBeNull();
    expect(msgInput.getAttribute("aria-describedby")).toBeNull();
    expect(container.querySelector("#wishes-message-error")).toBeNull();

    // Only attendance radiogroup is marked invalid
    expect(radiogroup.getAttribute("aria-invalid")).toBe("true");
    expect(radiogroup.getAttribute("aria-describedby")).toBe("wishes-attendance-error");
    expect(container.querySelector("#wishes-attendance-error")?.textContent).toContain(
      "Mohon pilih konfirmasi kehadiran Anda."
    );

    // 3. Now select attendance and submit with server write failure
    fakeGateway.failNextSubmitWith = new Error("Network timeout");
    await act(async () => {
      hadirBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Attendance selection cleared its error
    expect(radiogroup.getAttribute("aria-invalid")).toBeNull();

    await act(async () => {
      submitBtn.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });

    // Submission failure creates form-level alert WITHOUT marking valid controls invalid
    expect(nameInput.getAttribute("aria-invalid")).toBeNull();
    expect(msgInput.getAttribute("aria-invalid")).toBeNull();
    expect(radiogroup.getAttribute("aria-invalid")).toBeNull();

    const submitFeedback = container.querySelector("#wishes-submit-feedback");
    expect(submitFeedback).not.toBeNull();
    expect(submitFeedback?.getAttribute("role")).toBe("alert");
    expect(submitFeedback?.textContent).toContain(
      "Gagal mengirim ucapan. Coba lagi."
    );

    // Form inputs preserved on submit failure
    expect(nameInput.value).toBe("Hendra");
    expect(msgInput.value).toBe("Selamat menempuh hidup baru!");
    expect(hadirBtn?.getAttribute("aria-checked")).toBe("true");
  });

  it("submits wish, prevents double-submit, and resets form on success", async () => {
    const fakeGateway = new FakeWishesGateway({ "rika-fauzi": [] });
    fakeGateway.submitDelayMs = 50;

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    const nameInput = container.querySelector("#wishes-name") as HTMLInputElement;
    const msgInput = container.querySelector(
      "#wishes-message"
    ) as HTMLTextAreaElement;
    const submitBtn = container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    const hadirBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Hadir"
    );

    await act(async () => {
      changeInput(nameInput, "   Dewi Sartika   ");
      changeInput(msgInput, "   Barakallah lakuma!   ");
      hadirBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(hadirBtn?.getAttribute("aria-checked")).toBe("true");

    let submitPromise: Promise<void>;
    await act(async () => {
      submitPromise = (async () => {
        submitBtn.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        submitBtn.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
      })();
    });

    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent).toContain("Mengirim...");

    await act(async () => {
      await submitPromise;
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(fakeGateway.recordedWrites).toHaveLength(1);
    expect(fakeGateway.recordedWrites[0].input).toEqual({
      name: "Dewi Sartika",
      message: "Barakallah lakuma!",
      attendance: "Hadir",
    });

    expect(nameInput.value).toBe("");
    expect(msgInput.value).toBe("");
    expect(hadirBtn?.getAttribute("aria-checked")).toBe("false");
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.textContent).toContain("Kirim Ucapan");
  });

  it("verifies touch target size of all buttons is at least 44x44px", async () => {
    const fakeGateway = new FakeWishesGateway({ "rika-fauzi": [] });

    await act(async () => {
      root.render(
        <WishesSection
          invitationSlug="rika-fauzi"
          theme={mockTheme}
          gateway={fakeGateway}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBeGreaterThanOrEqual(3); // Hadir, Tidak Hadir, Submit

    for (const btn of buttons) {
      expect(btn.className).toContain("min-h-[44px]");
    }
  });
});
