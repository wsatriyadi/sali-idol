"use client";

import { useEffect, useState } from "react";
import { getDeviceId, getFingerprint } from "@/lib/device";
import { requestFcmToken } from "@/lib/firebase";
import Turnstile from "./Turnstile";

export type ContestantCard = {
  id: number;
  noUrut: number;
  nama: string;
  laguWajib: string;
  laguBebas: string;
  asalSkpd: string;
  fotoPath: string | null;
};

type MyVote = {
  kodeUndian: string;
  voterName?: string;
  contestant: ContestantCard;
};

export default function VoteClient({
  contestants,
  votingOpen,
  deadlineText,
  turnstileSiteKey,
}: {
  contestants: ContestantCard[];
  votingOpen: boolean;
  deadlineText: string | null;
  turnstileSiteKey?: string;
}) {
  const [selected, setSelected] = useState<ContestantCard | null>(null);
  const [voterName, setVoterName] = useState("");
  const [voterWhatsapp, setVoterWhatsapp] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [myVote, setMyVote] = useState<MyVote | null>(null);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    getFingerprint();
    requestFcmToken().then(setFcmToken);

    // Cek apakah device ini sudah vote → tampilkan hasil, bukan list
    fetch(`/api/vote/status?deviceId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.voted) {
          setMyVote({
            kodeUndian: d.kodeUndian,
            voterName: d.voterName,
            contestant: d.contestant,
          });
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  function openVote(c: ContestantCard) {
    setError(null);
    setVoterName("");
    setVoterWhatsapp("");
    setTurnstileToken("");
    setSelected(c);
  }

  async function submitVote() {
    if (!selected) return;
    if (!voterName.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    const waDigits = voterWhatsapp.replace(/\D/g, "");
    if (waDigits.length < 9) {
      setError("Nomor WhatsApp tidak valid");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fingerprint = await getFingerprint();
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestantId: selected.id,
          voterName: voterName.trim(),
          voterWhatsapp: waDigits,
          deviceId,
          fingerprint,
          turnstileToken,
          fcmToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal melakukan voting");
        setSubmitting(false);
        return;
      }
      // Tampilkan halaman kode undian + peserta yang divote
      setMyVote({
        kodeUndian: data.kodeUndian,
        voterName: voterName.trim(),
        contestant: selected,
      });
      setSelected(null);
      setSubmitting(false);
    } catch {
      setError("Terjadi kesalahan jaringan");
      setSubmitting(false);
    }
  }

  // Loader saat cek status
  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-brand-500" />
        <p className="mt-3 text-sm">Memuat…</p>
      </div>
    );
  }

  // Sudah vote → tampilkan kode undian + peserta yang dipilih
  if (myVote) {
    const c = myVote.contestant;
    return (
      <div className="flex flex-col items-center px-6 pb-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-4xl">
          ✅
        </div>
        <h2 className="text-xl font-black">
          {myVote.voterName ? `Terima kasih, ${myVote.voterName}!` : "Terima kasih!"}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Anda sudah menggunakan hak suara. Berikut pilihan &amp; kode undian Anda.
        </p>

        {/* Kode undian */}
        <div className="mt-6 w-full max-w-xs rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 shadow-xl shadow-brand-600/30">
          <p className="text-xs uppercase tracking-widest text-white/70">
            Kode Undian Anda
          </p>
          <p className="mt-2 select-all font-mono text-4xl font-black tracking-widest">
            {myVote.kodeUndian}
          </p>
        </div>

        {/* Peserta yang divote */}
        <p className="mt-8 mb-2 text-xs uppercase tracking-widest text-white/40">
          Peserta Pilihan Anda
        </p>
        <div className="w-full max-w-xs overflow-hidden rounded-2xl bg-night-800 ring-1 ring-white/10">
          <div className="relative aspect-square w-full bg-night-900">
            {c.fotoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.fotoPath}
                alt={c.nama}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl text-white/20">
                🎤
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold">
              #{c.noUrut}
            </span>
          </div>
          <div className="p-4 text-left">
            <h3 className="text-lg font-black">{c.nama}</h3>
            <p className="text-sm text-white/50">{c.asalSkpd}</p>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-white/70">
                <span className="text-white/40">Lagu Wajib:</span> {c.laguWajib}
              </p>
              <p className="text-white/70">
                <span className="text-white/40">Lagu Bebas:</span> {c.laguBebas}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-xs text-xs text-white/50">
          Simpan kode undian Anda. Jika memenangkan undian, notifikasi akan
          dikirim ke browser ini — pastikan izin notifikasi aktif.
        </p>
      </div>
    );
  }

  return (
    <>
      {!votingOpen && (
        <div className="mx-4 mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-center text-sm text-red-300">
          Periode voting telah berakhir.
        </div>
      )}
      {votingOpen && deadlineText && (
        <p className="px-4 pb-3 text-center text-xs text-white/50">
          Voting ditutup: {deadlineText}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 pb-24 sm:grid-cols-3">
        {contestants.map((c) => (
          <button
            key={c.id}
            onClick={() => openVote(c)}
            disabled={!votingOpen}
            className="group flex flex-col overflow-hidden rounded-2xl bg-night-800 text-left shadow-lg ring-1 ring-white/5 transition active:scale-95 disabled:opacity-50"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-night-900">
              {c.fotoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.fotoPath}
                  alt={c.nama}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-white/20">
                  🎤
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold">
                #{c.noUrut}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 p-3">
              <h3 className="truncate text-sm font-bold">{c.nama}</h3>
              <p className="truncate text-xs text-brand-400">{c.laguBebas}</p>
              <p className="truncate text-[11px] text-white/40">{c.asalSkpd}</p>
            </div>
          </button>
        ))}
      </div>

      {contestants.length === 0 && (
        <p className="px-4 py-12 text-center text-white/40">
          Belum ada peserta.
        </p>
      )}

      {/* Popup konfirmasi vote */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md animate-pop-in rounded-t-3xl bg-night-800 p-5 shadow-2xl ring-1 ring-white/10 sm:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-night-900">
                {selected.fotoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.fotoPath}
                    alt={selected.nama}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-white/20">
                    🎤
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/50">Peserta #{selected.noUrut}</p>
                <h3 className="truncate text-lg font-bold">{selected.nama}</h3>
                <p className="truncate text-xs text-brand-400">
                  {selected.laguBebas}
                </p>
              </div>
            </div>

            <label className="mb-1 block text-sm text-white/70">Nama Anda</label>
            <input
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="Masukkan nama"
              className="mb-3 w-full rounded-xl bg-night-900 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-brand-500"
              maxLength={60}
            />

            <label className="mb-1 block text-sm text-white/70">
              Nomor WhatsApp
            </label>
            <input
              value={voterWhatsapp}
              onChange={(e) => setVoterWhatsapp(e.target.value)}
              placeholder="cth: 08123456789"
              type="tel"
              inputMode="numeric"
              className="mb-3 w-full rounded-xl bg-night-900 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-brand-500"
              maxLength={20}
            />

            <p className="mb-3 text-center text-sm text-white/80">
              Yakin vote peserta{" "}
              <span className="font-bold text-brand-400">{selected.nama}</span>?
            </p>

            <div className="mb-3">
              <Turnstile onVerify={setTurnstileToken} siteKey={turnstileSiteKey} />
            </div>

            {error && (
              <p className="mb-3 text-center text-sm text-red-400">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                disabled={submitting}
                className="flex-1 rounded-xl bg-white/5 py-3 font-semibold text-white/70 ring-1 ring-white/10 active:scale-95"
              >
                Batal
              </button>
              <button
                onClick={submitVote}
                disabled={submitting}
                className="flex-1 rounded-xl bg-brand-600 py-3 font-bold text-white shadow-lg shadow-brand-600/30 active:scale-95 disabled:opacity-60"
              >
                {submitting ? "Memproses…" : "Ya, Vote!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
