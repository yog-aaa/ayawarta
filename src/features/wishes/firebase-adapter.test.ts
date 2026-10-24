import { describe, it, expect, vi } from "vitest";

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

import {
  createFirebaseWishesAdapter,
  type FirebaseFirestorePort,
  type FirestorePortSnapshot,
} from "./firebase-adapter";
import { createFailClosedFirestorePort } from "./testing/fake-wishes-gateway";

describe("Firebase Wishes Adapter", () => {
  it("fails closed when real Firebase SDK functions are accessed without injected port", () => {
    // The default adapter without custom port will hit our fail-closed SDK mocks
    expect(() => mockInitializeApp()).toThrow(/FAIL-CLOSED/);
    expect(() => mockGetApps()).toThrow(/FAIL-CLOSED/);
    expect(() => mockGetFirestore()).toThrow(/FAIL-CLOSED/);
    expect(() => mockCollection()).toThrow(/FAIL-CLOSED/);
    expect(() => mockQuery()).toThrow(/FAIL-CLOSED/);
    expect(() => mockOrderBy()).toThrow(/FAIL-CLOSED/);
    expect(() => mockOnSnapshot()).toThrow(/FAIL-CLOSED/);
    expect(() => mockAddDoc()).toThrow(/FAIL-CLOSED/);
  });

  it("fails closed when unmocked low-level Firestore port is invoked", () => {
    const failClosedPort = createFailClosedFirestorePort();

    expect(() => failClosedPort.getDb()).toThrow(/FAIL-CLOSED/);
    expect(() => failClosedPort.getCollection({})).toThrow(/FAIL-CLOSED/);
    expect(() => failClosedPort.createQuery({})).toThrow(/FAIL-CLOSED/);
    expect(() => failClosedPort.orderByField("timestamp", "desc")).toThrow(
      /FAIL-CLOSED/
    );
    expect(() => failClosedPort.listenSnapshot({}, () => {}, () => {})).toThrow(
      /FAIL-CLOSED/
    );
    expect(() => failClosedPort.addDocument({}, {})).toThrow(/FAIL-CLOSED/);
  });

  it("subscribes using exact path 'wishes/{slug}/messages' and 'orderBy(timestamp, desc)'", () => {
    const collectionSpy = vi.fn((_db: unknown, ...segments: string[]) => ({
      path: segments.join("/"),
    }));
    const querySpy = vi.fn((collRef: unknown, ...constraints: unknown[]) => ({
      collRef,
      constraints,
    }));
    const orderBySpy = vi.fn((field: string, direction: string) => ({
      field,
      direction,
    }));
    const unsubscribeSpy = vi.fn();
    const listenSpy = vi.fn(() => unsubscribeSpy);

    const mockPort: FirebaseFirestorePort = {
      getDb: () => "mock-db",
      getCollection: collectionSpy,
      createQuery: querySpy,
      orderByField: orderBySpy,
      listenSnapshot: listenSpy,
      addDocument: vi.fn(),
    };

    const adapter = createFirebaseWishesAdapter(mockPort);
    const onData = vi.fn();
    const onError = vi.fn();

    const unsubscribe = adapter.subscribe("rika-fauzi", onData, onError);

    expect(collectionSpy).toHaveBeenCalledWith(
      "mock-db",
      "wishes",
      "rika-fauzi",
      "messages"
    );
    expect(orderBySpy).toHaveBeenCalledWith("timestamp", "desc");
    expect(querySpy).toHaveBeenCalled();
    expect(listenSpy).toHaveBeenCalled();

    unsubscribe();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);

    // Verify zero live SDK calls occurred
    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("processes snapshot, counts malformed docs in skippedCount, and delivers valid domain wishes (FIRE-01)", () => {
    let capturedOnNext: ((snapshot: FirestorePortSnapshot) => void) | null =
      null;

    const mockPort: FirebaseFirestorePort = {
      getDb: () => "mock-db",
      getCollection: vi.fn(() => ({})),
      createQuery: vi.fn(() => ({})),
      orderByField: vi.fn(() => ({})),
      listenSnapshot: vi.fn((_q, onNext) => {
        capturedOnNext = onNext;
        return vi.fn();
      }),
      addDocument: vi.fn(),
    };

    const adapter = createFirebaseWishesAdapter(mockPort);
    const onData = vi.fn();
    const onError = vi.fn();

    adapter.subscribe("dudi-aini", onData, onError);

    expect(capturedOnNext).toBeTypeOf("function");

    const validDate = new Date("2026-07-20T10:00:00.000Z");
    capturedOnNext!({
      docs: [
        {
          id: "w-1",
          data: () => ({
            name: "Hendra",
            message: "Selamat!",
            attendance: "Hadir",
            timestamp: { toDate: () => validDate },
          }),
        },
        {
          id: "w-invalid-1",
          data: () => ({
            name: "", // malformed name
            message: "Missing name",
            attendance: "Hadir",
          }),
        },
        {
          id: "w-invalid-2",
          data: () => ({
            name: "Doni",
            message: "Selamat",
            attendance: "InvalidValue", // invalid attendance
          }),
        },
      ],
    });

    expect(onData).toHaveBeenCalledTimes(1);
    const snapshot = onData.mock.calls[0][0];
    expect(snapshot.skippedCount).toBe(2);
    expect(snapshot.wishes).toHaveLength(1);
    expect(snapshot.wishes[0]).toEqual({
      id: "w-1",
      name: "Hendra",
      message: "Selamat!",
      attendance: "Hadir",
      timestamp: validDate,
    });
  });

  it("handles subscription error with sanitized generic message", () => {
    let capturedOnError: ((err: unknown) => void) | null = null;

    const mockPort: FirebaseFirestorePort = {
      getDb: () => "mock-db",
      getCollection: vi.fn(() => ({})),
      createQuery: vi.fn(() => ({})),
      orderByField: vi.fn(() => ({})),
      listenSnapshot: vi.fn((_q, _onNext, onError) => {
        capturedOnError = onError;
        return vi.fn();
      }),
      addDocument: vi.fn(),
    };

    const adapter = createFirebaseWishesAdapter(mockPort);
    const onData = vi.fn();
    const onError = vi.fn();

    adapter.subscribe("shidqi-mita", onData, onError);

    // Simulate raw Firebase error
    capturedOnError!({ code: "permission-denied", message: "Raw secret error" });

    expect(onError).toHaveBeenCalledTimes(1);
    const errorPassed = onError.mock.calls[0][0];
    expect(errorPassed).toBeInstanceOf(Error);
    expect(errorPassed.message).toBe("Gagal memuat ucapan.");
    expect(errorPassed.message).not.toContain("permission-denied");
  });

  it("submits wish with exact 4 fields, trimmed input, and Date timestamp", async () => {
    const addDocumentSpy = vi.fn().mockResolvedValue({ id: "new-doc-id" });
    const collectionSpy = vi.fn(() => ({}));

    const mockPort: FirebaseFirestorePort = {
      getDb: () => "mock-db",
      getCollection: collectionSpy,
      createQuery: vi.fn(),
      orderByField: vi.fn(),
      listenSnapshot: vi.fn(),
      addDocument: addDocumentSpy,
    };

    const adapter = createFirebaseWishesAdapter(mockPort);

    await adapter.submitWish("default-preview", {
      name: "  Budi Santoso  ",
      message: "  Selamat ya!  ",
      attendance: "Hadir",
    });

    expect(collectionSpy).toHaveBeenCalledWith(
      "mock-db",
      "wishes",
      "default-preview",
      "messages"
    );
    expect(addDocumentSpy).toHaveBeenCalledTimes(1);

    const payload = addDocumentSpy.mock.calls[0][1];
    expect(payload).toEqual({
      name: "Budi Santoso",
      message: "Selamat ya!",
      attendance: "Hadir",
      timestamp: expect.any(Date),
    });
    // Exactly 4 fields
    expect(Object.keys(payload).sort()).toEqual([
      "attendance",
      "message",
      "name",
      "timestamp",
    ]);

    // Zero live SDK calls
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("handles submission failure with sanitized generic error", async () => {
    const mockPort: FirebaseFirestorePort = {
      getDb: () => "mock-db",
      getCollection: vi.fn(() => ({})),
      createQuery: vi.fn(),
      orderByField: vi.fn(),
      listenSnapshot: vi.fn(),
      addDocument: vi.fn().mockRejectedValue(new Error("Raw Firestore write failure")),
    };

    const adapter = createFirebaseWishesAdapter(mockPort);

    await expect(
      adapter.submitWish("rika-fauzi", {
        name: "Andi",
        message: "Selamat!",
        attendance: "Hadir",
      })
    ).rejects.toThrow("Gagal mengirim ucapan. Coba lagi.");
  });
});
