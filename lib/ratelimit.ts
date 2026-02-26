import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Returns null if rate limiting is not configured (no Upstash env vars).
// This lets the app run in dev/test without Redis while still enforcing
// limits in production.
function makeRatelimiter(tokens: number, windowSeconds: number) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(tokens, `${windowSeconds} s`),
    analytics: true,
  });
}

// Auth endpoints: 10 attempts per 60 seconds per IP
export const authLimiter = makeRatelimiter(10, 60);

// Registration: 5 new accounts per hour per IP
export const registerLimiter = makeRatelimiter(5, 3600);

// Answer submission: 30 per minute per IP (8 questions × generous buffer)
export const answerLimiter = makeRatelimiter(30, 60);

// General API: 60 requests per minute per IP
export const apiLimiter = makeRatelimiter(60, 60);

/**
 * Check rate limit. Returns a 429 Response if exceeded, otherwise null.
 * Identifier is typically the user's IP address.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  if (!limiter) return null; // not configured — allow through

  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }
  return null;
}

/** Extract the best available IP from a Next.js request. */
export function getIp(req: Request): string {
  const forwarded = (req as Request & { headers: Headers }).headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
