// Tiny in-memory TTL cache for report results.
// Keyed by report key + serialized filters. TTL defaults to 5 minutes.

interface Entry {
  value: any;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function buildKey(reportKey: string, filters?: Record<string, any>): string {
  if (!filters) return reportKey;
  const sorted = Object.keys(filters)
    .filter((k) => filters[k] !== undefined && filters[k] !== null && k !== 'type')
    .sort()
    .map((k) => `${k}=${filters[k]}`)
    .join('&');
  return `${reportKey}|${sorted}`;
}

export async function withCache<T>(
  reportKey: string,
  filters: Record<string, any> | undefined,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const key = buildKey(reportKey, filters);
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateReportCache(reportKey?: string) {
  if (!reportKey) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k === reportKey || k.startsWith(`${reportKey}|`)) store.delete(k);
  }
}
