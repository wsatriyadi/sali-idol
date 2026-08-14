/** WITA = UTC+8. Deadline vote disimpan sebagai UTC di DB;
 *  admin input/lihat dalam WITA. */
const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Input datetime-local dari admin (dianggap WITA) → Date UTC. */
export function witaLocalStringToUtc(local: string): Date {
  // local: "2026-08-20T21:00" (tanpa timezone, artinya WITA)
  const asUtc = new Date(local + ":00Z"); // parse sebagai UTC dulu
  return new Date(asUtc.getTime() - WITA_OFFSET_MS);
}

/** Date UTC → string untuk input datetime-local (WITA). */
export function utcToWitaLocalString(date: Date): string {
  const wita = new Date(date.getTime() + WITA_OFFSET_MS);
  return wita.toISOString().slice(0, 16);
}

/** Date UTC → tampilan WITA yang ramah. */
export function formatWita(date: Date): string {
  const wita = new Date(date.getTime() + WITA_OFFSET_MS);
  const s = wita.toISOString().replace("T", " ").slice(0, 16);
  return `${s} WITA`;
}

/** Apakah periode voting masih terbuka? deadline null = selalu buka. */
export function isVotingOpen(deadline: Date | null): boolean {
  if (!deadline) return true;
  return Date.now() < deadline.getTime();
}
