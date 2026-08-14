import { createHash } from "crypto";

/** SHA-256 hex hash. Dipakai untuk device_id, fingerprint, ip, user-agent.
 *  Jangan pernah simpan nilai mentah — hanya hash (§2, §8 aturan). */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
