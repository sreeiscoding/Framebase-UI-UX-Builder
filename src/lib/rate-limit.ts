type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export const rateLimit = (params: {
  key: string;
  limit: number;
  windowMs: number;
}) => {
  const { key, limit, windowMs } = params;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
};

export const buildRateLimitKey = (parts: Array<string | number | undefined>) =>
  parts.filter(Boolean).join(":");
