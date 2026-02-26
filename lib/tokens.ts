import { randomBytes } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex"); // 64-char hex string
}

export function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}
