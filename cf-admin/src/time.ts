// Tampilan waktu WITA (UTC+8) untuk SPA.
// D1 datetime('now') = "YYYY-MM-DD HH:MM:SS" (UTC, tanpa tz) → normalisasi ke UTC.

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

function toUtcDate(s: string): Date {
  let v = s.trim();
  if (v.includes(" ") && !v.includes("T")) v = v.replace(" ", "T");
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) v += "Z"; // anggap UTC
  return new Date(v);
}

export function formatWita(iso: string): string {
  const wita = new Date(toUtcDate(iso).getTime() + WITA_OFFSET_MS);
  return `${wita.toISOString().replace("T", " ").slice(0, 16)} WITA`;
}
