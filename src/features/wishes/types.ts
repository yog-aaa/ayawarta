export type ReadAttendance = "Hadir" | "Tidak Hadir" | "Belum Konfirmasi";
export type WriteAttendance = "Hadir" | "Tidak Hadir";

export interface Wish {
  id: string;
  name: string;
  message: string;
  attendance: ReadAttendance;
  timestamp: Date;
}

export interface WishesSnapshot {
  wishes: Wish[];
  skippedCount: number;
}

export interface WishInput {
  name: string;
  message: string;
  attendance: WriteAttendance;
}

export interface WishesGateway {
  subscribe(
    slug: string,
    onData: (snapshot: WishesSnapshot) => void,
    onError: (error: Error) => void
  ): () => void;
  submitWish(slug: string, input: WishInput): Promise<void>;
}

export type WishesStatus = "loading" | "ready" | "error";

export interface FirestorePortDoc {
  id: string;
  data: () => Record<string, unknown>;
}

export interface FirestorePortSnapshot {
  docs: FirestorePortDoc[];
}

export interface FirebaseFirestorePort {
  getCollection: (db: unknown, ...segments: string[]) => unknown;
  createQuery: (collectionRef: unknown, ...constraints: unknown[]) => unknown;
  orderByField: (field: string, direction: "asc" | "desc") => unknown;
  listenSnapshot: (
    queryRef: unknown,
    onNext: (snapshot: FirestorePortSnapshot) => void,
    onError: (err: unknown) => void
  ) => () => void;
  addDocument: (
    collectionRef: unknown,
    data: Record<string, unknown>
  ) => Promise<unknown>;
  getDb: () => unknown;
}
