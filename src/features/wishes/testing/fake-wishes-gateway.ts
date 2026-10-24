import type {
  Wish,
  WishInput,
  WishesGateway,
  WishesSnapshot,
  FirebaseFirestorePort,
} from "../types";

export interface RecordedWrite {
  slug: string;
  input: WishInput;
  timestamp: Date;
}

export class FakeWishesGateway implements WishesGateway {
  private wishesBySlug = new Map<string, Wish[]>();
  private skippedBySlug = new Map<string, number>();
  private activeSubscriptions = new Map<
    string,
    Set<{
      onData: (snapshot: WishesSnapshot) => void;
      onError: (error: Error) => void;
    }>
  >();

  public totalSubscribed = 0;
  public totalUnsubscribed = 0;
  public currentActiveSubscriptions = 0;
  public recordedWrites: RecordedWrite[] = [];
  public failNextSubmitWith: Error | null = null;
  public submitDelayMs = 0;
  public autoEmitInitial = true;

  constructor(
    initialWishes: Record<string, Wish[]> = {},
    initialSkipped: Record<string, number> = {}
  ) {
    for (const [slug, list] of Object.entries(initialWishes)) {
      this.wishesBySlug.set(slug, [...list]);
    }
    for (const [slug, count] of Object.entries(initialSkipped)) {
      this.skippedBySlug.set(slug, count);
    }
  }

  setWishes(slug: string, wishes: Wish[], skippedCount = 0) {
    this.wishesBySlug.set(slug, [...wishes]);
    this.skippedBySlug.set(slug, skippedCount);
    this.emitWishes(slug);
  }

  emitWishes(slug: string) {
    const list = this.wishesBySlug.get(slug) ?? [];
    const skipped = this.skippedBySlug.get(slug) ?? 0;
    const subs = this.activeSubscriptions.get(slug);
    if (subs) {
      subs.forEach((sub) =>
        sub.onData({ wishes: [...list], skippedCount: skipped })
      );
    }
  }

  emitError(slug: string, error: Error) {
    const subs = this.activeSubscriptions.get(slug);
    if (subs) {
      subs.forEach((sub) => sub.onError(error));
    }
  }

  subscribe(
    slug: string,
    onData: (snapshot: WishesSnapshot) => void,
    onError: (error: Error) => void
  ): () => void {
    this.totalSubscribed++;
    this.currentActiveSubscriptions++;

    if (!this.activeSubscriptions.has(slug)) {
      this.activeSubscriptions.set(slug, new Set());
    }
    const subscriber = { onData, onError };
    this.activeSubscriptions.get(slug)!.add(subscriber);

    const currentList = this.wishesBySlug.get(slug) ?? [];
    const skipped = this.skippedBySlug.get(slug) ?? 0;
    if (this.autoEmitInitial) {
      queueMicrotask(() => {
        if (this.activeSubscriptions.get(slug)?.has(subscriber)) {
          onData({ wishes: [...currentList], skippedCount: skipped });
        }
      });
    }

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.totalUnsubscribed++;
      this.currentActiveSubscriptions--;
      this.activeSubscriptions.get(slug)?.delete(subscriber);
    };
  }

  async submitWish(slug: string, input: WishInput): Promise<void> {
    if (this.submitDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.submitDelayMs));
    }

    if (this.failNextSubmitWith) {
      const err = this.failNextSubmitWith;
      this.failNextSubmitWith = null;
      throw err;
    }

    const recorded: RecordedWrite = {
      slug,
      input: { ...input },
      timestamp: new Date(),
    };
    this.recordedWrites.push(recorded);

    const newWish: Wish = {
      id: `fake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: input.name,
      message: input.message,
      attendance: input.attendance,
      timestamp: recorded.timestamp,
    };

    const current = this.wishesBySlug.get(slug) ?? [];
    this.wishesBySlug.set(slug, [newWish, ...current]);
    this.emitWishes(slug);
  }
}

export interface SubscriptionRecord {
  id: number;
  slug: string;
  onData: (snapshot: WishesSnapshot) => void;
  onError: (error: Error) => void;
  unsubscribeCount: number;
  active: boolean;
}

export class ControllableWishesGateway implements WishesGateway {
  public subscriptions: SubscriptionRecord[] = [];
  public recordedWrites: RecordedWrite[] = [];
  public failNextSubmitWith: Error | null = null;
  private nextId = 0;

  subscribe(
    slug: string,
    onData: (snapshot: WishesSnapshot) => void,
    onError: (error: Error) => void
  ): () => void {
    const id = this.nextId++;
    const record: SubscriptionRecord = {
      id,
      slug,
      onData,
      onError,
      unsubscribeCount: 0,
      active: true,
    };
    this.subscriptions.push(record);

    return () => {
      record.unsubscribeCount++;
      record.active = false;
    };
  }

  async submitWish(slug: string, input: WishInput): Promise<void> {
    if (this.failNextSubmitWith) {
      const err = this.failNextSubmitWith;
      this.failNextSubmitWith = null;
      throw err;
    }
    this.recordedWrites.push({
      slug,
      input: { ...input },
      timestamp: new Date(),
    });
  }

  emitData(id: number, snapshot: WishesSnapshot) {
    const record = this.subscriptions.find((s) => s.id === id);
    if (!record) {
      throw new Error(`Subscription with id ${id} not found.`);
    }
    record.onData(snapshot);
  }

  emitError(id: number, error: Error) {
    const record = this.subscriptions.find((s) => s.id === id);
    if (!record) {
      throw new Error(`Subscription with id ${id} not found.`);
    }
    record.onError(error);
  }

  getSubscription(id: number): SubscriptionRecord | undefined {
    return this.subscriptions.find((s) => s.id === id);
  }

  getTotalSubscriptions(): number {
    return this.subscriptions.length;
  }

  getTotalUnsubscribes(): number {
    return this.subscriptions.reduce((sum, s) => sum + s.unsubscribeCount, 0);
  }

  getActiveCount(): number {
    return this.subscriptions.filter((s) => s.active).length;
  }
}

export function createFailClosedFirestorePort(): FirebaseFirestorePort {
  return {
    getCollection: () => {
      throw new Error("FAIL-CLOSED: Unexpected live Firestore collection call.");
    },
    createQuery: () => {
      throw new Error("FAIL-CLOSED: Unexpected live Firestore query call.");
    },
    orderByField: () => {
      throw new Error("FAIL-CLOSED: Unexpected live Firestore orderBy call.");
    },
    listenSnapshot: () => {
      throw new Error("FAIL-CLOSED: Unexpected live Firestore onSnapshot call.");
    },
    addDocument: () => {
      throw new Error("FAIL-CLOSED: Unexpected live Firestore addDoc call.");
    },
    getDb: () => {
      throw new Error("FAIL-CLOSED: Unexpected live Firestore getDb call.");
    },
  };
}
