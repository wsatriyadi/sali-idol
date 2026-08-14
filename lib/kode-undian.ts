import { randomInt } from "crypto";

// Hindari karakter ambigu: 0/O, 1/I/L
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function block(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Format: XXXX-XXXX (mis. 1WCX-JWS3 gaya). */
export function generateKodeUndian(): string {
  return `${block(4)}-${block(4)}`;
}
