/** Rate limiter in-memory sederhana per key (mis. IP). §7 aturan.
 *  Untuk produksi multi-instance ganti dengan Redis/Cloudflare. */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (b.count >= limit) return { ok: false, remaining: 0 };

  b.count += 1;
  return { ok: true, remaining: limit - b.count };
}

/** Ambil IP client dari header (Cloudflare / proxy aware). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}
