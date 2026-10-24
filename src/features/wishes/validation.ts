import type { Wish, WriteAttendance, ReadAttendance } from "./types";

export interface ValidatedWishInput {
  name: string;
  message: string;
  attendance: WriteAttendance;
}

export function validateWishInput(input: unknown): ValidatedWishInput {
  if (!input || typeof input !== "object") {
    throw new Error("Formulir ucapan tidak valid.");
  }

  const raw = input as Record<string, unknown>;
  const rawName = typeof raw.name === "string" ? raw.name : "";
  const rawMessage = typeof raw.message === "string" ? raw.message : "";
  const name = rawName.trim();
  const message = rawMessage.trim();
  const attendance = raw.attendance;

  if (!name && !message) {
    throw new Error("Nama dan ucapan tidak boleh kosong.");
  }
  if (!name) {
    throw new Error("Nama tidak boleh kosong.");
  }
  if (!message) {
    throw new Error("Ucapan tidak boleh kosong.");
  }

  if (attendance !== "Hadir" && attendance !== "Tidak Hadir") {
    throw new Error("Mohon pilih konfirmasi kehadiran Anda.");
  }

  return {
    name,
    message,
    attendance,
  };
}

const VALID_READ_ATTENDANCE: Set<ReadAttendance> = new Set([
  "Hadir",
  "Tidak Hadir",
  "Belum Konfirmasi",
]);

export function parseWishDocument(
  id: string,
  raw: Record<string, unknown>
): Wish | null {
  if (!id || typeof id !== "string") {
    console.warn("[Wishes] Skipping wish document with invalid ID");
    return null;
  }
  if (!raw || typeof raw !== "object") {
    console.warn("[Wishes] Skipping malformed wish document");
    return null;
  }

  const rawName = typeof raw.name === "string" ? raw.name : "";
  const rawMessage = typeof raw.message === "string" ? raw.message : "";
  const name = rawName.trim();
  const message = rawMessage.trim();

  if (!name || !message) {
    console.warn("[Wishes] Skipping wish document with missing name or message");
    return null;
  }

  const attendance = raw.attendance as ReadAttendance;
  if (!attendance || !VALID_READ_ATTENDANCE.has(attendance)) {
    console.warn("[Wishes] Skipping wish document with invalid attendance");
    return null;
  }

  let date: Date | null = null;
  const rawTimestamp = raw.timestamp;

  if (
    rawTimestamp &&
    typeof rawTimestamp === "object" &&
    "toDate" in rawTimestamp &&
    typeof (rawTimestamp as { toDate: () => unknown }).toDate === "function"
  ) {
    try {
      const converted = (rawTimestamp as { toDate: () => unknown }).toDate();
      if (converted instanceof Date && !isNaN(converted.getTime())) {
        date = converted;
      }
    } catch {
      date = null;
    }
  } else if (rawTimestamp instanceof Date && !isNaN(rawTimestamp.getTime())) {
    date = rawTimestamp;
  } else if (
    typeof rawTimestamp === "number" ||
    typeof rawTimestamp === "string"
  ) {
    const parsedDate = new Date(rawTimestamp);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
    }
  }

  if (!date) {
    console.warn("[Wishes] Skipping wish document with invalid timestamp");
    return null;
  }

  return {
    id,
    name,
    message,
    attendance,
    timestamp: date,
  };
}
