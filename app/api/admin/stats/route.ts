import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [totalPeserta, totalVotes, totalDraws, topRaw] = await Promise.all([
    prisma.contestant.count(),
    prisma.vote.count(),
    prisma.undianDraw.count(),
    prisma.vote.groupBy({
      by: ["contestantId"],
      _count: { contestantId: true },
      orderBy: { _count: { contestantId: "desc" } },
      take: 5,
    }),
  ]);

  const ids = topRaw.map((t) => t.contestantId);
  const contestants = await prisma.contestant.findMany({
    where: { id: { in: ids } },
  });
  const byId = new Map(contestants.map((c) => [c.id, c]));
  const top = topRaw.map((t) => ({
    nama: byId.get(t.contestantId)?.nama ?? "—",
    votes: t._count.contestantId,
  }));

  // Vote per jam (24 jam terakhir)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.vote.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const hourly = new Array(24).fill(0);
  const nowH = new Date().getUTCHours();
  for (const v of recent) {
    const diffH = Math.floor((Date.now() - v.createdAt.getTime()) / 3_600_000);
    if (diffH < 24) hourly[23 - diffH]++;
  }

  return NextResponse.json({
    totalPeserta,
    totalVotes,
    totalDraws,
    top,
    hourly,
    nowHour: nowH,
  });
}
