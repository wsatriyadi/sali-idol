/** Verifikasi token Cloudflare Turnstile di server (WAJIB, §6 aturan).
 *  Token tidak boleh dipercaya hanya dari client.
 *  Secret diambil dari pengaturan (DB) bila ada, jatuh ke env sebagai fallback. */
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string,
  secretOverride?: string | null
): Promise<boolean> {
  const secret = secretOverride || process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("Turnstile secret belum diset (DB/env)");
    return false;
  }
  if (!token) return false;

  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (e) {
    console.error("Turnstile verify error", e);
    return false;
  }
}
