"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

const DEVICE_KEY = "sali_device_id";
const COOKIE = "voting_device_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Ambil / buat device id, simpan di localStorage + cookie (§3 aturan). */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(DEVICE_KEY, id);
  }
  // Mirror ke cookie (lapisan tambahan)
  document.cookie = `${COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  return id;
}

let fpCache: string | null = null;

/** Browser fingerprint hash (§4 aturan). */
export async function getFingerprint(): Promise<string> {
  if (fpCache) return fpCache;
  try {
    const fp = await FingerprintJS.load();
    const res = await fp.get();
    fpCache = res.visitorId;
    return fpCache;
  } catch {
    return "unknown";
  }
}
