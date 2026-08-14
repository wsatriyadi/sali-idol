import { prisma } from "@/lib/db";
import { formatWita } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function VotingListPage() {
  const votes = await prisma.vote.findMany({
    orderBy: { createdAt: "desc" },
    include: { contestant: true },
    take: 500,
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">List Voting</h1>
      <p className="mb-6 text-sm text-white/50">
        {votes.length} suara terekam (maks 500 terbaru)
      </p>

      <div className="overflow-x-auto rounded-2xl bg-night-800 ring-1 ring-white/5 scrollbar-thin">
        <table className="w-full min-w-[640px] text-left text-sm">
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
            {votes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Belum ada voting.
                </td>
              </tr>
            )}
            {votes.map((v, i) => (
              <tr key={v.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/50">{i + 1}</td>
                <td className="px-4 py-3 font-semibold">{v.voterName}</td>
                <td className="px-4 py-3 text-white/70">
                  {v.voterWhatsapp ? (
                    <a
                      href={`https://wa.me/${v.voterWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:underline"
                    >
                      {v.voterWhatsapp}
                    </a>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-white/70">{v.contestant.nama}</td>
                <td className="px-4 py-3 font-mono text-brand-400">
                  {v.kodeUndian}
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {formatWita(v.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
