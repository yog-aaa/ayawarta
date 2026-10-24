import { describe, it, expect, vi } from "vitest";
import { validateWishInput, parseWishDocument } from "./validation";

describe("Wishes Input Validation", () => {
  it("validates and trims valid input with Hadir", () => {
    const input = {
      name: "  Budi Santoso  ",
      message: "  Selamat menempuh hidup baru!  ",
      attendance: "Hadir",
    };

    const result = validateWishInput(input);
    expect(result).toEqual({
      name: "Budi Santoso",
      message: "Selamat menempuh hidup baru!",
      attendance: "Hadir",
    });
  });

  it("validates and trims valid input with Tidak Hadir", () => {
    const input = {
      name: "Siti Rahma",
      message: "Mohon maaf belum bisa hadir.",
      attendance: "Tidak Hadir",
    };

    const result = validateWishInput(input);
    expect(result.attendance).toBe("Tidak Hadir");
  });

  it("rejects non-object input", () => {
    expect(() => validateWishInput(null)).toThrow(/tidak valid/i);
    expect(() => validateWishInput("invalid")).toThrow(/tidak valid/i);
    expect(() => validateWishInput(123)).toThrow(/tidak valid/i);
  });

  it("rejects empty or whitespace-only name and message", () => {
    expect(() =>
      validateWishInput({
        name: "   ",
        message: "   ",
        attendance: "Hadir",
      })
    ).toThrow(/nama dan ucapan tidak boleh kosong/i);

    expect(() =>
      validateWishInput({
        name: "   ",
        message: "Selamat ya!",
        attendance: "Hadir",
      })
    ).toThrow(/nama tidak boleh kosong/i);

    expect(() =>
      validateWishInput({
        name: "Andi",
        message: "   ",
        attendance: "Hadir",
      })
    ).toThrow(/ucapan tidak boleh kosong/i);
  });

  it("rejects missing or invalid attendance", () => {
    expect(() =>
      validateWishInput({
        name: "Andi",
        message: "Selamat!",
        attendance: null,
      })
    ).toThrow(/pilih konfirmasi kehadiran/i);

    expect(() =>
      validateWishInput({
        name: "Andi",
        message: "Selamat!",
        attendance: undefined,
      })
    ).toThrow(/pilih konfirmasi kehadiran/i);

    expect(() =>
      validateWishInput({
        name: "Andi",
        message: "Selamat!",
        attendance: "Belum Konfirmasi", // Historical value not allowed in new submission
      })
    ).toThrow(/pilih konfirmasi kehadiran/i);

    expect(() =>
      validateWishInput({
        name: "Andi",
        message: "Selamat!",
        attendance: "Mungkin",
      })
    ).toThrow(/pilih konfirmasi kehadiran/i);
  });
});

describe("Wishes Document Parser", () => {
  it("parses valid document with Firestore Timestamp (toDate())", () => {
    const expectedDate = new Date("2026-06-15T10:00:00.000Z");
    const raw = {
      name: "Ahmad",
      message: "Barakallah!",
      attendance: "Hadir",
      timestamp: {
        toDate: () => expectedDate,
      },
    };

    const parsed = parseWishDocument("doc-1", raw);
    expect(parsed).toEqual({
      id: "doc-1",
      name: "Ahmad",
      message: "Barakallah!",
      attendance: "Hadir",
      timestamp: expectedDate,
    });
  });

  it("parses valid document with Date instance", () => {
    const expectedDate = new Date("2026-06-15T12:00:00.000Z");
    const raw = {
      name: "Nurul",
      message: "Selamat berbahagia!",
      attendance: "Tidak Hadir",
      timestamp: expectedDate,
    };

    const parsed = parseWishDocument("doc-2", raw);
    expect(parsed).toEqual({
      id: "doc-2",
      name: "Nurul",
      message: "Selamat berbahagia!",
      attendance: "Tidak Hadir",
      timestamp: expectedDate,
    });
  });

  it("parses historical attendance 'Belum Konfirmasi' cleanly without migration", () => {
    const expectedDate = new Date("2025-01-01T08:00:00.000Z");
    const raw = {
      name: "Tamu Lama",
      message: "Semoga lancar acaranya.",
      attendance: "Belum Konfirmasi",
      timestamp: expectedDate,
    };

    const parsed = parseWishDocument("doc-historical", raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.attendance).toBe("Belum Konfirmasi");
  });

  it("skips malformed document and preserves sibling records in array", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const docs = [
      {
        id: "doc-valid-1",
        data: {
          name: "Rudi",
          message: "Selamat!",
          attendance: "Hadir",
          timestamp: new Date("2026-05-01T10:00:00Z"),
        },
      },
      {
        id: "doc-malformed-1",
        data: {
          name: "", // empty name
          message: "No name here",
          attendance: "Hadir",
          timestamp: new Date(),
        },
      },
      {
        id: "doc-malformed-2",
        data: {
          name: "Dewi",
          message: "Selamat!",
          attendance: "InvalidAttendance", // unknown attendance
          timestamp: new Date(),
        },
      },
      {
        id: "doc-malformed-3",
        data: {
          name: "Eko",
          message: "Selamat!",
          attendance: "Hadir",
          timestamp: "not-a-valid-date", // invalid timestamp
        },
      },
      {
        id: "doc-valid-2",
        data: {
          name: "Maya",
          message: "Happy wedding!",
          attendance: "Tidak Hadir",
          timestamp: new Date("2026-05-02T10:00:00Z"),
        },
      },
    ];

    const results = docs
      .map((d) => parseWishDocument(d.id, d.data))
      .filter((w) => w !== null);

    expect(results).toHaveLength(2);
    expect(results[0]?.name).toBe("Rudi");
    expect(results[1]?.name).toBe("Maya");
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
