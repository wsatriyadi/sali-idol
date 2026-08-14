import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { sendFcmNotification } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/** GET: riwayat undian (pemenang doorprize). */
export async function GET() {
  const draws = await prisma.undianDraw.findMany({
    orderBy: { drawnAt: "desc" },
    include: { vote: { include: { contestant: true } } },
  });
  return NextResponse.json(
    draws.map((d) => ({
      id: d.id,
      kodeUndian: d.vote.kodeUndian,
      voterName: d.vote.voterName,
      pesertaDipilih: d.vote.contestant.nama,
      drawnAt: d.drawnAt,
    }))
  );
}

/** POST: tarik satu pemenang undian acak dari vote yang belum menang. */
export async function POST() {
  // Kandidat: vote yang belum pernah menang undian
  const eligible = await prisma.vote.findMany({
    where: { draw: null },
    select: { id: true },
  });

  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada peserta undian yang tersisa." },
      { status: 400 }
    );
  }

  const pick = eligible[randomInt(eligible.length)];

  // Simpan pemenang (unique voteId cegah double)
  let vote;
  try {
    await prisma.undianDraw.create({ data: { voteId: pick.id } });
    vote = await prisma.vote.findUnique({
      where: { id: pick.id },
      include: { contestant: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menarik undian. Coba lagi." },
      { status: 500 }
    );
  }

  if (!vote) {
    return NextResponse.json({ error: "Vote tidak ditemukan." }, { status: 500 });
  }

  await prisma.auditLog
    .create({
      data: {
        action: "UNDIAN_DRAW",
        contestantId: vote.contestantId,
        result: vote.kodeUndian,
        reason: vote.voterName,
      },
    })
    .catch(() => {});

  // Kirim notif FCM ke browser voter pemenang
  let notified = false;
  if (vote.fcmToken) {
    notified = await sendFcmNotification(
      vote.fcmToken,
      "🎉 Selamat! Anda Menang Undian",
      `Kode ${vote.kodeUndian} atas nama ${vote.voterName} memenangkan undian SALI IDOL!`,
      { type: "undian_winner", kode: vote.kodeUndian }
    );
  }

  return NextResponse.json({
    kodeUndian: vote.kodeUndian,
    voterName: vote.voterName,
    pesertaDipilih: vote.contestant.nama,
    notified,
  });
}
