type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const states = new Map<string, RateLimitState>();
const MAX_TRACKED_KEYS = 10_000;

function prune(now: number) {
  for (const [key, state] of states) {
    if (state.resetAt <= now) states.delete(key);
  }
}

function enforceCapacity() {
  while (states.size >= MAX_TRACKED_KEYS) {
    const oldest = [...states.entries()].sort(
      ([, left], [, right]) => left.resetAt - right.resetAt,
    )[0];
    if (!oldest) return;
    states.delete(oldest[0]);
  }
}

export function consumeRateLimit(key: string, options: RateLimitOptions, now = Date.now()) {
  prune(now);
  const current = states.get(key);
  if (!current || current.resetAt <= now) {
    enforceCapacity();
    states.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: Math.max(options.limit - 1, 0), retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(options.limit - current.count, 0),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimits() {
  states.clear();
}
