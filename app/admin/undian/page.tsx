"use client";

import { useEffect, useRef, useState } from "react";

type Draw = {
  id: number;
  kodeUndian: string;
  voterName: string;
  pesertaDipilih: string;
  drawnAt: string;
};

type Winner = {
  kodeUndian: string;
  voterName: string;
  pesertaDipilih: string;
  notified: boolean;
};

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function fakeCode() {
  const b = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `${b(4)}-${b(4)}`;
}

export default function UndianPage() {
  const [history, setHistory] = useState<Draw[]>([]);
  const [shuffling, setShuffling] = useState(false);
  const [display, setDisplay] = useState("————-————");
  const [winner, setWinner] = useState<Winner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shuffleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadHistory() {
    const res = await fetch("/api/admin/undian/draw");
    if (res.ok) setHistory(await res.json());
  }

  useEffect(() => {
    loadHistory();
    return () => {
      if (shuffleTimer.current) clearInterval(shuffleTimer.current);
    };
  }, []);

  async function draw() {
    setError(null);
    setWinner(null);
    setShuffling(true);

    // Animasi acak kode
    shuffleTimer.current = setInterval(() => setDisplay(fakeCode()), 60);

    // Panggil server + jeda minimal 2.5s biar animasi terasa
    const [res] = await Promise.all([
      fetch("/api/admin/undian/draw", { method: "POST" }),
      new Promise((r) => setTimeout(r, 2500)),
    ]);

    if (shuffleTimer.current) clearInterval(shuffleTimer.current);

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menarik undian");
      setDisplay("————-————");
      setShuffling(false);
      return;
    }

    setDisplay(data.kodeUndian);
    setWinner(data);
    setShuffling(false);
    loadHistory();
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">Sistem Undian</h1>
      <p className="mb-6 text-sm text-white/50">
        Tarik pemenang doorprize secara acak & live
      </p>

      <div className="rounded-3xl bg-gradient-to-br from-night-800 to-night-900 p-8 text-center ring-1 ring-white/10">
        <p className="mb-4 text-xs uppercase tracking-widest text-white/40">
          Kode Undian
        </p>
        <div
          className={`mb-6 font-mono text-5xl font-black tracking-widest sm:text-6xl ${
            shuffling ? "animate-shuffle text-brand-400" : "text-white"
          }`}
        >
          {display}
        </div>
        <button
          onClick={draw}
          disabled={shuffling}
          className="rounded-2xl bg-brand-600 px-8 py-4 text-lg font-black shadow-xl shadow-brand-600/40 transition active:scale-95 disabled:opacity-60"
        >
          {shuffling ? "Mengacak…" : "🎲 Tarik Undian"}
        </button>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      <h2 className="mb-3 mt-8 font-bold">Riwayat Pemenang Undian</h2>
      <div className="overflow-x-auto rounded-2xl bg-night-800 ring-1 ring-white/5 scrollbar-thin">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Vote Untuk</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                  Belum ada undian ditarik.
                </td>
              </tr>
            )}
            {history.map((d, i) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/50">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-brand-400">
                  {d.kodeUndian}
                </td>
                <td className="px-4 py-3 font-semibold">{d.voterName}</td>
                <td className="px-4 py-3 text-white/60">{d.pesertaDipilih}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popup pemenang */}
      {winner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setWinner(null)}
        >
          <div
            className="w-full max-w-sm animate-pop-in rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-6xl">🎉</div>
            <p className="text-sm uppercase tracking-widest text-white/70">
              Pemenang Undian
            </p>
            <p className="my-3 font-mono text-4xl font-black tracking-widest">
              {winner.kodeUndian}
            </p>
            <p className="text-xl font-bold">{winner.voterName}</p>
            <p className="mt-1 text-sm text-white/70">
              memilih {winner.pesertaDipilih}
            </p>
            <p className="mt-4 text-xs text-white/60">
              {winner.notified
                ? "✅ Notifikasi terkirim ke browser pemenang"
                : "ℹ️ Notifikasi tidak terkirim (browser tidak berlangganan)"}
            </p>
            <button
              onClick={() => setWinner(null)}
              className="mt-6 w-full rounded-xl bg-white/15 py-3 font-bold hover:bg-white/25"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
