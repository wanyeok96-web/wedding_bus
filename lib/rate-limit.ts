const hits = new Map<string, { count: number; reset: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || now > current.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
