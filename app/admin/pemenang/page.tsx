import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PemenangPage() {
  const grouped = await prisma.vote.groupBy({
    by: ["contestantId"],
    _count: { contestantId: true },
    orderBy: { _count: { contestantId: "desc" } },
  });

  const contestants = await prisma.contestant.findMany();
  const byId = new Map(contestants.map((c) => [c.id, c]));

  // Sertakan peserta tanpa vote di bagian bawah
  const voted = new Set(grouped.map((g) => g.contestantId));
  const ranking = [
    ...grouped.map((g) => ({
      c: byId.get(g.contestantId)!,
      votes: g._count.contestantId,
    })),
    ...contestants
      .filter((c) => !voted.has(c.id))
      .map((c) => ({ c, votes: 0 })),
  ].filter((r) => r.c);

  const podium = ranking.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const order = [1, 0, 2]; // tampilan podium: 2-1-3

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">Pemenang</h1>
      <p className="mb-6 text-sm text-white/50">
        Peringkat berdasarkan jumlah vote
      </p>

      {podium.length > 0 && (
        <div className="mb-6 flex items-end justify-center gap-3">
          {order
            .filter((i) => podium[i])
            .map((i) => {
              const r = podium[i];
              const heights = ["h-28", "h-36", "h-24"];
              return (
                <div key={r.c.id} className="flex w-24 flex-col items-center">
                  <div className="mb-2 h-16 w-16 overflow-hidden rounded-full ring-2 ring-brand-500">
                    {r.c.fotoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.c.fotoPath}
                        alt={r.c.nama}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-night-800 text-2xl">
                        🎤
                      </div>
                    )}
                  </div>
                  <p className="mb-1 truncate text-center text-xs font-semibold">
                    {r.c.nama}
                  </p>
                  <div
                    className={`flex ${heights[i]} w-full flex-col items-center justify-start rounded-t-xl bg-gradient-to-b from-brand-600 to-brand-700 pt-2`}
                  >
                    <span className="text-2xl">{medals[i]}</span>
                    <span className="mt-1 text-lg font-black">{r.votes}</span>
                    <span className="text-[10px] text-white/70">vote</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-night-800 ring-1 ring-white/5 scrollbar-thin">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">Juara</th>
              <th className="px-4 py-3">Peserta</th>
              <th className="px-4 py-3">Asal SKPD</th>
              <th className="px-4 py-3 text-right">Vote</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                  Belum ada data.
                </td>
              </tr>
            )}
            {ranking.map((r, i) => (
              <tr key={r.c.id} className="border-b border-white/5">
                <td className="px-4 py-3 font-bold text-white/50">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 overflow-hidden rounded-lg bg-night-950">
                      {r.c.fotoPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.c.fotoPath}
                          alt={r.c.nama}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20">
                          🎤
                        </div>
                      )}
                    </div>
                    <span className="font-semibold">{r.c.nama}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">{r.c.asalSkpd}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-400">
                  {r.votes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
