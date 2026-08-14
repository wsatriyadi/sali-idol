"use client";

import { useEffect, useState } from "react";

export default function PengaturanPage() {
  const [eventTitle, setEventTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [tsSite, setTsSite] = useState("");
  const [tsSecret, setTsSecret] = useState("");
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Ganti password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        setEventTitle(s.eventTitle || "");
        setDeadline(s.voteDeadlineWita || "");
        setTsSite(s.turnstileSiteKey || "");
        setTsSecret(s.turnstileSecretKey || "");
        setHeaderPreview(s.headerImagePath);
        setFaviconPreview(s.faviconPath);
      });
  }, []);

  async function saveGeneral() {
    setSavingGeneral(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("eventTitle", eventTitle);
    fd.append("voteDeadlineWita", deadline);
    fd.append("turnstileSiteKey", tsSite);
    fd.append("turnstileSecretKey", tsSecret);
    if (headerFile) fd.append("headerImage", headerFile);
    if (faviconFile) fd.append("favicon", faviconFile);

    const res = await fetch("/api/admin/settings", { method: "POST", body: fd });
    const data = await res.json();
    setMsg(res.ok ? "✅ Pengaturan disimpan" : data.error || "Gagal menyimpan");
    setSavingGeneral(false);
  }

  async function changePassword() {
    setSavingPw(true);
    setPwMsg(null);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg("✅ Password berhasil diganti");
      setCurPw("");
      setNewPw("");
    } else {
      setPwMsg(data.error || "Gagal mengganti password");
    }
    setSavingPw(false);
  }

  const card = "rounded-2xl bg-night-800 p-6 ring-1 ring-white/5";
  const input =
    "w-full rounded-xl bg-night-900 px-4 py-2.5 outline-none ring-1 ring-white/10 focus:ring-brand-500";
  const fileBtn =
    "cursor-pointer rounded-xl bg-white/5 px-4 py-2 text-sm hover:bg-white/10";

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-black">Pengaturan</h1>
      <p className="mb-6 text-sm text-white/50">Konfigurasi platform voting</p>

      <div className="space-y-4">
        {/* Umum */}
        <div className={card}>
          <h2 className="mb-4 font-bold">Umum & Tampilan</h2>

          <label className="mb-1 block text-sm text-white/70">Judul Acara</label>
          <input
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            className={`${input} mb-4`}
          />

          <label className="mb-1 block text-sm text-white/70">
            Batas Akhir Vote (WITA)
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`${input} mb-1`}
          />
          <p className="mb-4 text-xs text-white/40">
            Zona waktu WITA (UTC+8). Kosongkan untuk voting tanpa batas.
          </p>

          <label className="mb-1 block text-sm text-white/70">
            Turnstile Site Key
          </label>
          <input
            value={tsSite}
            onChange={(e) => setTsSite(e.target.value)}
            placeholder="0x4AAAAA..."
            className={`${input} mb-3`}
          />
          <label className="mb-1 block text-sm text-white/70">
            Turnstile Secret Key
          </label>
          <input
            type="password"
            value={tsSecret}
            onChange={(e) => setTsSecret(e.target.value)}
            placeholder="0x4AAAAA..."
            className={`${input} mb-1`}
          />
          <p className="mb-4 text-xs text-white/40">
            Cloudflare Turnstile (anti-bot). Kosongkan untuk pakai key dari env.
          </p>

          <label className="mb-1 block text-sm text-white/70">
            Gambar Header
          </label>
          <div className="mb-4 flex items-center gap-4">
            <div className="h-16 w-28 overflow-hidden rounded-lg bg-night-950">
              {headerPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headerPreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/20">
                  header
                </div>
              )}
            </div>
            <label className={fileBtn}>
              Unggah
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setHeaderFile(f);
                  if (f) setHeaderPreview(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>

          <label className="mb-1 block text-sm text-white/70">Favicon</label>
          <div className="mb-4 flex items-center gap-4">
            <div className="h-10 w-10 overflow-hidden rounded-lg bg-night-950">
              {faviconPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconPreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/20">
                  ico
                </div>
              )}
            </div>
            <label className={fileBtn}>
              Unggah
              <input
                type="file"
                accept="image/*,.ico"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFaviconFile(f);
                  if (f) setFaviconPreview(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>

          {msg && <p className="mb-3 text-sm text-white/80">{msg}</p>}
          <button
            onClick={saveGeneral}
            disabled={savingGeneral}
            className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold disabled:opacity-60"
          >
            {savingGeneral ? "Menyimpan…" : "Simpan"}
          </button>
        </div>

        {/* Ganti password */}
        <div className={card}>
          <h2 className="mb-4 font-bold">Ganti Password Admin</h2>
          <label className="mb-1 block text-sm text-white/70">
            Password Lama
          </label>
          <input
            type="password"
            value={curPw}
            onChange={(e) => setCurPw(e.target.value)}
            className={`${input} mb-4`}
          />
          <label className="mb-1 block text-sm text-white/70">
            Password Baru
          </label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className={`${input} mb-1`}
          />
          <p className="mb-4 text-xs text-white/40">Minimal 6 karakter.</p>

          {pwMsg && <p className="mb-3 text-sm text-white/80">{pwMsg}</p>}
          <button
            onClick={changePassword}
            disabled={savingPw}
            className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold disabled:opacity-60"
          >
            {savingPw ? "Menyimpan…" : "Ganti Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
