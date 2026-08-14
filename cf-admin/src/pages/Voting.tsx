import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { formatWita } from "../time";

type Vote = {
  id: number;
  voterName: string;
  voterWhatsapp: string | null;
  peserta: string;
  kodeUndian: string;
  createdAt: string;
};

export default function Voting() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiGet<Vote[]>("/api/admin/votes").then((v) => {
      setVotes(v);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">List Voting</h1>
      <p className="mb-6 text-sm text-white/50">{votes.length} suara terekam (maks 1000 terbaru)</p>

      <div className="overflow-x-auto rounded-2xl bg-night-800 ring-1 ring-white/5 scrollbar-thin">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Nama Voter</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Nama Peserta</th>
              <th className="px-4 py-3">Kode Undian</th>
              <th className="px-4 py-3">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/40">Memuat…</td></tr>}
            {!loading && votes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/40">Belum ada voting.</td></tr>}
            {votes.map((v, i) => (
              <tr key={v.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/50">{i + 1}</td>
                <td className="px-4 py-3 font-semibold">{v.voterName}</td>
                <td className="px-4 py-3">
                  {v.voterWhatsapp ? (
                    <a href={`https://wa.me/${v.voterWhatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                      {v.voterWhatsapp}
                    </a>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-white/70">{v.peserta}</td>
                <td className="px-4 py-3 font-mono text-brand-400">{v.kodeUndian}</td>
                <td className="px-4 py-3 text-xs text-white/40">{formatWita(v.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
