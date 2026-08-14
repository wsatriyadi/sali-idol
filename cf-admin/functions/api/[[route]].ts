import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { getCookie, setCookie } from "hono/cookie";
import {
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "../lib/crypto";
import {
  generateKodeUndian,
  witaLocalToUtcIso,
  utcIsoToWitaLocal,
  formatWita,
  isVotingOpen,
  normalizeWhatsapp,
} from "../lib/util";

type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  SESSION_SECRET: string;
};

const app = new Hono<{ Bindings: Env; Variables: { admin: { adminId: number; username: string } } }>().basePath(
  "/api"
);

// ── Helpers ────────────────────────────────────────────────────
function fotoUrl(key: string | null): string | null {
  return key ? `/api/uploads/${key}` : null;
}

async function saveToR2(
  bucket: R2Bucket,
  file: File | null,
  prefix: string
): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "png";
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return key;
}

// ── Auth middleware untuk /api/admin/* (kecuali login/logout) ──
app.use("/admin/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path === "/api/admin/login" || path === "/api/admin/logout") return next();
  const token = getCookie(c, SESSION_COOKIE);
  const session = await verifySession(token, c.env.SESSION_SECRET);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("admin", session);
  return next();
});

// ════════════════════════ PUBLIC (dipakai exe) ═══════════════════

app.get("/contestants", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, no_urut, nama, lagu_wajib, lagu_bebas, asal_skpd, foto_key FROM contestants WHERE is_active = 1 ORDER BY no_urut ASC"
  ).all();
  return c.json(
    (results as any[]).map((r) => ({
      id: r.id,
      noUrut: r.no_urut,
      nama: r.nama,
      laguWajib: r.lagu_wajib,
      laguBebas: r.lagu_bebas,
      asalSkpd: r.asal_skpd,
      fotoUrl: fotoUrl(r.foto_key),
    }))
  );
});

app.get("/settings/public", async (c) => {
  const s = await c.env.DB.prepare(
    "SELECT event_title, header_key, vote_deadline FROM settings WHERE id = 1"
  ).first<any>();
  return c.json({
    eventTitle: s?.event_title || "SALI IDOL",
    headerUrl: fotoUrl(s?.header_key ?? null),
    votingOpen: isVotingOpen(s?.vote_deadline),
    deadlineText: s?.vote_deadline ? formatWita(s.vote_deadline) : null,
  });
});

app.post("/vote", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Request tidak valid" }, 400);
  const { contestantId, voterName, voterWhatsapp } = body;

  if (!contestantId || !String(voterName || "").trim()) {
    return c.json({ error: "Data tidak lengkap" }, 400);
  }
  const whatsapp = normalizeWhatsapp(voterWhatsapp);
  if (!whatsapp) return c.json({ error: "Nomor WhatsApp tidak valid" }, 400);

  // Periode voting
  const s = await c.env.DB.prepare("SELECT vote_deadline FROM settings WHERE id = 1").first<any>();
  if (!isVotingOpen(s?.vote_deadline)) {
    return c.json({ error: "Periode voting telah berakhir." }, 403);
  }

  // Kandidat aktif
  const contestant = await c.env.DB.prepare(
    "SELECT id FROM contestants WHERE id = ? AND is_active = 1"
  )
    .bind(contestantId)
    .first<any>();
  if (!contestant) return c.json({ error: "Peserta tidak ditemukan." }, 404);

  // 1 nomor WhatsApp = 1 vote
  const dup = await c.env.DB.prepare("SELECT id FROM votes WHERE voter_whatsapp = ?")
    .bind(whatsapp)
    .first();
  if (dup) {
    return c.json({ error: "Nomor WhatsApp ini sudah digunakan untuk voting." }, 409);
  }

  const name = String(voterName).trim().slice(0, 60);
  for (let attempt = 0; attempt < 5; attempt++) {
    const kode = generateKodeUndian();
    try {
      await c.env.DB.prepare(
        "INSERT INTO votes (voter_name, voter_whatsapp, contestant_id, kode_undian) VALUES (?, ?, ?, ?)"
      )
        .bind(name, whatsapp, contestantId, kode)
        .run();
      return c.json({ kodeUndian: kode });
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("voter_whatsapp")) {
        return c.json({ error: "Nomor WhatsApp ini sudah digunakan untuk voting." }, 409);
      }
      if (msg.includes("kode_undian")) continue; // kolisi kode, coba lagi
      return c.json({ error: "Gagal menyimpan suara." }, 500);
    }
  }
  return c.json({ error: "Gagal membuat kode undian." }, 500);
});

// ════════════════════════ R2 SERVE ══════════════════════════════
app.get("/uploads/:prefix/:name", async (c) => {
  const key = `${c.req.param("prefix")}/${c.req.param("name")}`;
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.text("Not found", 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: obj.httpEtag,
    },
  });
});

// ════════════════════════ ADMIN AUTH ════════════════════════════
app.post("/admin/login", async (c) => {
  const { username, password } = (await c.req.json().catch(() => ({}))) as any;
  if (!username || !password) return c.json({ error: "Username dan password wajib diisi" }, 400);
  const admin = await c.env.DB.prepare(
    "SELECT id, username, password_hash FROM admins WHERE username = ?"
  )
    .bind(username)
    .first<any>();
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return c.json({ error: "Username atau password salah" }, 401);
  }
  const token = await createSession(
    { adminId: admin.id, username: admin.username },
    c.env.SESSION_SECRET
  );
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return c.json({ ok: true });
});

app.post("/admin/logout", async (c) => {
  setCookie(c, SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return c.json({ ok: true });
});

app.post("/admin/change-password", async (c) => {
  const admin = c.get("admin");
  const { currentPassword, newPassword } = (await c.req.json().catch(() => ({}))) as any;
  if (!currentPassword || !newPassword) return c.json({ error: "Password lama & baru wajib diisi" }, 400);
  if (String(newPassword).length < 6) return c.json({ error: "Password baru minimal 6 karakter" }, 400);
  const row = await c.env.DB.prepare("SELECT password_hash FROM admins WHERE id = ?")
    .bind(admin.adminId)
    .first<any>();
  if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
    return c.json({ error: "Password lama salah" }, 401);
  }
  const hash = await hashPassword(String(newPassword));
  await c.env.DB.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").bind(hash, admin.adminId).run();
  return c.json({ ok: true });
});

// ════════════════════════ ADMIN DATA ════════════════════════════
app.get("/admin/me", (c) => c.json({ username: c.get("admin").username }));

app.get("/admin/stats", async (c) => {
  const db = c.env.DB;
  const [peserta, votes, draws] = await Promise.all([
    db.prepare("SELECT COUNT(*) n FROM contestants").first<any>(),
    db.prepare("SELECT COUNT(*) n FROM votes").first<any>(),
    db.prepare("SELECT COUNT(*) n FROM undian_draws").first<any>(),
  ]);
  const { results: top } = await db
    .prepare(
      `SELECT c.nama, COUNT(v.id) votes FROM contestants c
       LEFT JOIN votes v ON v.contestant_id = c.id
       GROUP BY c.id ORDER BY votes DESC LIMIT 5`
    )
    .all();
  const s = await db.prepare("SELECT vote_deadline, event_title FROM settings WHERE id = 1").first<any>();
  return c.json({
    totalPeserta: peserta?.n ?? 0,
    totalVotes: votes?.n ?? 0,
    totalDraws: draws?.n ?? 0,
    top: (top as any[]).map((t) => ({ nama: t.nama, votes: t.votes })),
    eventTitle: s?.event_title || "SALI IDOL",
    votingOpen: isVotingOpen(s?.vote_deadline),
    deadlineText: s?.vote_deadline ? formatWita(s.vote_deadline) : null,
  });
});

app.get("/admin/contestants", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM votes v WHERE v.contestant_id = c.id) votes
     FROM contestants c ORDER BY c.no_urut ASC`
  ).all();
  return c.json(
    (results as any[]).map((r) => ({
      id: r.id,
      noUrut: r.no_urut,
      nama: r.nama,
      laguWajib: r.lagu_wajib,
      laguBebas: r.lagu_bebas,
      asalSkpd: r.asal_skpd,
      fotoUrl: fotoUrl(r.foto_key),
      isActive: !!r.is_active,
      votes: r.votes,
    }))
  );
});

app.post("/admin/contestants", async (c) => {
  const form = await c.req.formData();
  const nama = String(form.get("nama") || "").trim();
  const noUrut = parseInt(String(form.get("noUrut") || ""), 10);
  const laguWajib = String(form.get("laguWajib") || "").trim();
  const laguBebas = String(form.get("laguBebas") || "").trim();
  const asalSkpd = String(form.get("asalSkpd") || "").trim();
  if (!nama || !noUrut || !laguWajib || !laguBebas || !asalSkpd) {
    return c.json({ error: "Semua field wajib diisi" }, 400);
  }
  const fotoKey = await saveToR2(c.env.BUCKET, form.get("foto") as File | null, "peserta");
  try {
    await c.env.DB.prepare(
      "INSERT INTO contestants (no_urut, nama, lagu_wajib, lagu_bebas, asal_skpd, foto_key) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(noUrut, nama, laguWajib, laguBebas, asalSkpd, fotoKey)
      .run();
    return c.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message).includes("no_urut")) return c.json({ error: "Nomor urut sudah dipakai" }, 409);
    return c.json({ error: "Gagal menambah peserta" }, 500);
  }
});

app.patch("/admin/contestants/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const form = await c.req.formData();
  const fields: Record<string, string> = {
    nama: "nama",
    noUrut: "no_urut",
    laguWajib: "lagu_wajib",
    laguBebas: "lagu_bebas",
    asalSkpd: "asal_skpd",
  };
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, col] of Object.entries(fields)) {
    const v = form.get(k);
    if (v !== null) {
      sets.push(`${col} = ?`);
      vals.push(col === "no_urut" ? parseInt(String(v), 10) : String(v).trim());
    }
  }
  const isActive = form.get("isActive");
  if (isActive !== null) {
    sets.push("is_active = ?");
    vals.push(String(isActive) === "true" ? 1 : 0);
  }
  const fotoKey = await saveToR2(c.env.BUCKET, form.get("foto") as File | null, "peserta");
  if (fotoKey) {
    sets.push("foto_key = ?");
    vals.push(fotoKey);
  }
  if (!sets.length) return c.json({ ok: true });
  vals.push(id);
  try {
    await c.env.DB.prepare(`UPDATE contestants SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
    return c.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message).includes("no_urut")) return c.json({ error: "Nomor urut sudah dipakai" }, 409);
    return c.json({ error: "Gagal memperbarui" }, 500);
  }
});

app.delete("/admin/contestants/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  await c.env.DB.prepare("DELETE FROM contestants WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

app.get("/admin/votes", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT v.id, v.voter_name, v.voter_whatsapp, v.kode_undian, v.created_at, c.nama peserta
     FROM votes v JOIN contestants c ON c.id = v.contestant_id
     ORDER BY v.created_at DESC LIMIT 1000`
  ).all();
  return c.json(
    (results as any[]).map((r) => ({
      id: r.id,
      voterName: r.voter_name,
      voterWhatsapp: r.voter_whatsapp,
      peserta: r.peserta,
      kodeUndian: r.kode_undian,
      createdAt: r.created_at,
    }))
  );
});

app.get("/admin/pemenang", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.nama, c.asal_skpd, c.foto_key, COUNT(v.id) votes
     FROM contestants c LEFT JOIN votes v ON v.contestant_id = c.id
     GROUP BY c.id ORDER BY votes DESC, c.no_urut ASC`
  ).all();
  return c.json(
    (results as any[]).map((r) => ({
      id: r.id,
      nama: r.nama,
      asalSkpd: r.asal_skpd,
      fotoUrl: fotoUrl(r.foto_key),
      votes: r.votes,
    }))
  );
});

app.get("/admin/undian", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT d.id, d.drawn_at, v.kode_undian, v.voter_name, v.voter_whatsapp, c.nama peserta
     FROM undian_draws d JOIN votes v ON v.id = d.vote_id
     JOIN contestants c ON c.id = v.contestant_id
     ORDER BY d.drawn_at DESC`
  ).all();
  return c.json(
    (results as any[]).map((r) => ({
      id: r.id,
      kodeUndian: r.kode_undian,
      voterName: r.voter_name,
      voterWhatsapp: r.voter_whatsapp,
      pesertaDipilih: r.peserta,
      drawnAt: r.drawn_at,
    }))
  );
});

app.post("/admin/undian/draw", async (c) => {
  // Vote yang belum menang
  const { results } = await c.env.DB.prepare(
    "SELECT id FROM votes WHERE id NOT IN (SELECT vote_id FROM undian_draws)"
  ).all();
  const ids = (results as any[]).map((r) => r.id);
  if (!ids.length) return c.json({ error: "Tidak ada peserta undian tersisa." }, 400);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const voteId = ids[buf[0] % ids.length];
  try {
    await c.env.DB.prepare("INSERT INTO undian_draws (vote_id) VALUES (?)").bind(voteId).run();
  } catch {
    return c.json({ error: "Gagal menarik undian." }, 500);
  }
  const v = await c.env.DB.prepare(
    `SELECT v.kode_undian, v.voter_name, v.voter_whatsapp, c.nama peserta
     FROM votes v JOIN contestants c ON c.id = v.contestant_id WHERE v.id = ?`
  )
    .bind(voteId)
    .first<any>();
  return c.json({
    kodeUndian: v.kode_undian,
    voterName: v.voter_name,
    voterWhatsapp: v.voter_whatsapp,
    pesertaDipilih: v.peserta,
  });
});

app.get("/admin/settings", async (c) => {
  const s = await c.env.DB.prepare("SELECT * FROM settings WHERE id = 1").first<any>();
  return c.json({
    eventTitle: s?.event_title || "SALI IDOL",
    headerUrl: fotoUrl(s?.header_key ?? null),
    faviconUrl: fotoUrl(s?.favicon_key ?? null),
    voteDeadlineWita: s?.vote_deadline ? utcIsoToWitaLocal(s.vote_deadline) : "",
  });
});

app.post("/admin/settings", async (c) => {
  const form = await c.req.formData();
  const sets: string[] = [];
  const vals: any[] = [];

  const eventTitle = form.get("eventTitle");
  if (eventTitle !== null && String(eventTitle).trim()) {
    sets.push("event_title = ?");
    vals.push(String(eventTitle).trim());
  }
  const deadline = form.get("voteDeadlineWita");
  if (deadline !== null) {
    const v = String(deadline).trim();
    sets.push("vote_deadline = ?");
    vals.push(v ? witaLocalToUtcIso(v) : null);
  }
  const headerKey = await saveToR2(c.env.BUCKET, form.get("headerImage") as File | null, "header");
  if (headerKey) {
    sets.push("header_key = ?");
    vals.push(headerKey);
  }
  const faviconKey = await saveToR2(c.env.BUCKET, form.get("favicon") as File | null, "favicon");
  if (faviconKey) {
    sets.push("favicon_key = ?");
    vals.push(faviconKey);
  }
  sets.push("updated_at = datetime('now')");
  if (sets.length) {
    await c.env.DB.prepare(`UPDATE settings SET ${sets.join(", ")} WHERE id = 1`).bind(...vals).run();
  }
  return c.json({ ok: true });
});

export const onRequest = handle(app);
