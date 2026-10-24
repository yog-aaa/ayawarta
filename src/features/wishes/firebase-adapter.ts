"use client";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  type DocumentData,
  type Query,
  type FirestoreError,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { getWishesCollectionSegments } from "./paths";
import { validateWishInput, parseWishDocument } from "./validation";
import type {
  Wish,
  WishInput,
  WishesGateway,
  WishesSnapshot,
  FirestorePortDoc,
  FirestorePortSnapshot,
  FirebaseFirestorePort,
} from "./types";

export type { FirestorePortDoc, FirestorePortSnapshot, FirebaseFirestorePort };

function createDefaultPort(): FirebaseFirestorePort {
  return {
    getCollection: (database, ...segments) => {
      const [first, ...rest] = segments;
      return collection(
        database as Parameters<typeof collection>[0],
        first,
        ...rest
      );
    },
    createQuery: (collRef, ...constraints) =>
      query(
        collRef as Parameters<typeof query>[0],
        ...(constraints as Parameters<typeof query>[1][])
      ),
    orderByField: (field, direction) => orderBy(field, direction),
    listenSnapshot: (queryRef, onNext, onError) => {
      const q = queryRef as Query<DocumentData>;
      return onSnapshot(
        q,
        (snapshot) => {
          onNext({
            docs: snapshot.docs.map((doc) => ({
              id: doc.id,
              data: () => doc.data() as Record<string, unknown>,
            })),
          });
        },
        (err: FirestoreError) => onError(err)
      );
    },
    addDocument: (collRef, data) =>
      addDoc(collRef as Parameters<typeof addDoc>[0], data),
    getDb: () => getFirebaseDb(),
  };
}

export function createFirebaseWishesAdapter(
  customPort?: FirebaseFirestorePort
): WishesGateway {
  const port = customPort ?? createDefaultPort();

  return {
    subscribe(
      slug: string,
      onData: (snapshot: WishesSnapshot) => void,
      onError: (error: Error) => void
    ): () => void {
      try {
        const segments = getWishesCollectionSegments(slug);
        const database = port.getDb();
        const collRef = port.getCollection(database, ...segments);
        const orderConstraint = port.orderByField("timestamp", "desc");
        const queryRef = port.createQuery(collRef, orderConstraint);

        return port.listenSnapshot(
          queryRef,
          (snapshot) => {
            const validWishes: Wish[] = [];
            let skippedCount = 0;
            for (const doc of snapshot.docs) {
              const parsed = parseWishDocument(doc.id, doc.data());
              if (parsed) {
                validWishes.push(parsed);
              } else {
                skippedCount++;
              }
            }
            onData({ wishes: validWishes, skippedCount });
          },
          () => {
            onError(new Error("Gagal memuat ucapan."));
          }
        );
      } catch {
        onError(new Error("Gagal memuat ucapan."));
        return () => {};
      }
    },

    async submitWish(slug: string, input: WishInput): Promise<void> {
      const validated = validateWishInput(input);
      const segments = getWishesCollectionSegments(slug);
      const database = port.getDb();
      const collRef = port.getCollection(database, ...segments);

      try {
        await port.addDocument(collRef, {
          name: validated.name,
          message: validated.message,
          attendance: validated.attendance,
          timestamp: new Date(),
        });
      } catch {
        throw new Error("Gagal mengirim ucapan. Coba lagi.");
      }
    },
  };
}

export const defaultFirebaseWishesAdapter: WishesGateway = {
  subscribe(slug, onData, onError) {
    return createFirebaseWishesAdapter().subscribe(slug, onData, onError);
  },
  submitWish(slug, input) {
    return createFirebaseWishesAdapter().submitWish(slug, input);
  },
};
