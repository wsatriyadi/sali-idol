import { prisma } from "@/lib/db";
import { formatWita, isVotingOpen } from "@/lib/time";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl bg-night-800 p-5 ring-1 ring-white/5">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/20 text-xl">
        {icon}
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [totalPeserta, totalVotes, totalDraws, setting, topRaw] =
    await Promise.all([
      prisma.contestant.count(),
      prisma.vote.count(),
      prisma.undianDraw.count(),
      prisma.setting.findUnique({ where: { id: 1 } }),
      prisma.vote.groupBy({
        by: ["contestantId"],
        _count: { contestantId: true },
        orderBy: { _count: { contestantId: "desc" } },
        take: 5,
      }),
    ]);

  const contestants = await prisma.contestant.findMany({
    where: { id: { in: topRaw.map((t) => t.contestantId) } },
  });
  const byId = new Map(contestants.map((c) => [c.id, c]));
  const top = topRaw.map((t) => ({
    nama: byId.get(t.contestantId)?.nama ?? "—",
    votes: t._count.contestantId,
  }));
  const maxVotes = top[0]?.votes || 1;

  const deadline = setting?.voteDeadline ?? null;
  const open = isVotingOpen(deadline);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">Dashboard</h1>
      <p className="mb-6 text-sm text-white/50">
        Ringkasan {setting?.eventTitle || "SALI IDOL"}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Peserta" value={totalPeserta} icon="🎤" />
        <StatCard label="Total Vote" value={totalVotes} icon="🗳️" />
        <StatCard label="Undian Ditarik" value={totalDraws} icon="🎲" />
        <StatCard
          label="Status Voting"
          value={open ? "Buka" : "Tutup"}
          icon={open ? "🟢" : "🔴"}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-night-800 p-5 ring-1 ring-white/5">
        <p className="text-sm text-white/50">Batas akhir voting</p>
        <p className="text-lg font-bold">
          {deadline ? formatWita(deadline) : "Belum diatur"}
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-night-800 p-5 ring-1 ring-white/5">
        <h2 className="mb-4 font-bold">Peserta Terpopuler</h2>
        {top.length === 0 && (
          <p className="text-sm text-white/40">Belum ada vote.</p>
        )}
        <div className="space-y-3">
          {top.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 text-sm font-bold text-white/40">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{t.nama}</span>
                  <span className="text-white/60">{t.votes} vote</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-night-950">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(t.votes / maxVotes) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
