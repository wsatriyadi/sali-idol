// Fetch helper untuk API. Cookie session dikirim otomatis (same-origin).

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...opts });
  if (res.status === 401) {
    // Sesi habis → ke login
    if (!location.pathname.startsWith("/login")) location.href = "/login";
    throw new Error("Unauthorized");
  }
  return res;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await req(path);
  return res.json();
}

export async function apiJson(path: string, method: string, body: any) {
  const res = await req(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

export async function apiForm(path: string, method: string, form: FormData) {
  const res = await req(path, { method, body: form });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}
