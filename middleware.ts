import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "sali_admin_session";

async function isValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authed = await isValid(token);

  // API admin: tolak 401 jika belum auth (kecuali login/logout)
  if (pathname.startsWith("/api/admin")) {
    if (
      pathname === "/api/admin/login" ||
      pathname === "/api/admin/logout"
    ) {
      return NextResponse.next();
    }
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Halaman admin: redirect ke /login jika belum auth
  if (pathname.startsWith("/admin")) {
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Sudah login tapi buka /login → arahkan ke dashboard
  if (pathname === "/login" && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login"],
};
