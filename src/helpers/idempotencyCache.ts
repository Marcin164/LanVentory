/**
 * Tiny in-memory idempotency cache. Stores a response keyed by `${scope}:${key}`
 * for `ttlMs`. If the same scope+key arrives again before expiry, callers can
 * return the prior response instead of re-processing.
 *
 * Single-process only — for multi-instance deployments swap in Redis (same
 * interface). Memory is bounded by the sweep on every put.
 */
type Entry = { value: unknown; expiresAt: number };

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 5000;

class IdempotencyCache {
  private store = new Map<string, Entry>();

  private sweep() {
    if (this.store.size < MAX_ENTRIES) return;
    const now = Date.now();
    for (const [k, v] of this.store) {
      if (v.expiresAt < now) this.store.delete(k);
    }
    // If still over, evict oldest insertion order.
    while (this.store.size >= MAX_ENTRIES) {
      const firstKey = this.store.keys().next().value;
      if (!firstKey) break;
      this.store.delete(firstKey);
    }
  }

  get<T>(scope: string, key: string): T | null {
    const k = `${scope}:${key}`;
    const entry = this.store.get(k);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(k);
      return null;
    }
    return entry.value as T;
  }

  put<T>(scope: string, key: string, value: T, ttlMs = TTL_MS): void {
    this.sweep();
    this.store.set(`${scope}:${key}`, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }
}

export const idempotencyCache = new IdempotencyCache();
