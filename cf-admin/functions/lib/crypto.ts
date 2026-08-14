// Password hashing (PBKDF2 via Web Crypto — bcrypt tak jalan di Workers)
// + SHA-256 + JWT session (jose). Semua edge-compatible.

import { SignJWT, jwtVerify } from "jose";

const enc = new TextEncoder();

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const ITER = 100_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const salt = fromB64(saltB64);
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: parseInt(iterStr, 10), hash: "SHA-256" },
      key,
      256
    );
    return b64(bits) === hashB64;
  } catch {
    return false;
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── JWT session ────────────────────────────────────────────────
const MAX_AGE = 60 * 60 * 8; // 8 jam

export type SessionPayload = { adminId: number; username: string };

export async function createSession(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(enc.encode(secret));
}

export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, enc.encode(secret));
    return { adminId: payload.adminId as number, username: payload.username as string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "sali_admin_session";
export const SESSION_MAX_AGE = MAX_AGE;
