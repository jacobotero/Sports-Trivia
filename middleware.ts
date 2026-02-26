import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// These paths work without email verification
const UNVERIFIED_ALLOWED = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (UNVERIFIED_ALLOWED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not signed in — guest access allowed
  if (!token) return NextResponse.next();

  // Signed in but not verified — redirect to verification gate
  if (!token.emailVerified) {
    const url = req.nextUrl.clone();
    url.pathname = "/verify-email";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
