import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "sali_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 jam

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum diset");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { adminId: number; username: string };

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { adminId: payload.adminId as number, username: payload.username as string };
  } catch {
    return null;
  }
}

/** Set cookie sesi (dipanggil dari route handler / server action). */
export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    // Secure hanya bila dilayani via HTTPS. Set COOKIE_SECURE=true saat pakai TLS.
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Ambil sesi dari cookie di server component / route handler. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySession(token);
}

export const SESSION_COOKIE = COOKIE_NAME;
