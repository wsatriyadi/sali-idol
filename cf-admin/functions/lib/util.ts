// Kode undian + waktu WITA (port dari app lama, edge-compatible).

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // anti-ambigu

function randInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function block(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[randInt(ALPHABET.length)];
  return out;
}

/** Format XXXX-XXXX. */
export function generateKodeUndian(): string {
  return `${block(4)}-${block(4)}`;
}

// ── Waktu WITA (UTC+8) ─────────────────────────────────────────
const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** datetime-local (dianggap WITA) → ISO UTC string. */
export function witaLocalToUtcIso(local: string): string {
  const asUtc = new Date(local + ":00Z");
  return new Date(asUtc.getTime() - WITA_OFFSET_MS).toISOString();
}

/** ISO UTC → string datetime-local (WITA). */
export function utcIsoToWitaLocal(iso: string): string {
  const wita = new Date(new Date(iso).getTime() + WITA_OFFSET_MS);
  return wita.toISOString().slice(0, 16);
}

/** ISO UTC → tampilan "YYYY-MM-DD HH:MM WITA". */
export function formatWita(iso: string): string {
  const wita = new Date(new Date(iso).getTime() + WITA_OFFSET_MS);
  return `${wita.toISOString().replace("T", " ").slice(0, 16)} WITA`;
}

/** deadline null/kosong = selalu buka. */
export function isVotingOpen(deadlineIso: string | null | undefined): boolean {
  if (!deadlineIso) return true;
  return Date.now() < new Date(deadlineIso).getTime();
}

/** Normalisasi WhatsApp: hanya digit, 0xxx → 62xxx. Return null jika invalid. */
export function normalizeWhatsapp(raw: string): string | null {
  let wa = String(raw || "").replace(/\D/g, "");
  if (wa.length < 9 || wa.length > 15) return null;
  if (wa.startsWith("0")) wa = "62" + wa.slice(1);
  return wa;
}
