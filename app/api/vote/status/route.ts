import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/hash";

export const dynamic = "force-dynamic";

/** Cek apakah device ini sudah vote. Kembalikan kode undian + peserta yang dipilih. */
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) return NextResponse.json({ voted: false });

  const deviceIdHash = sha256(deviceId);
  const vote = await prisma.vote.findUnique({
    where: { deviceIdHash },
    include: { contestant: true },
  });

  if (!vote) return NextResponse.json({ voted: false });

  return NextResponse.json({
    voted: true,
    kodeUndian: vote.kodeUndian,
    voterName: vote.voterName,
    contestant: {
      id: vote.contestant.id,
      noUrut: vote.contestant.noUrut,
      nama: vote.contestant.nama,
      laguWajib: vote.contestant.laguWajib,
      laguBebas: vote.contestant.laguBebas,
      asalSkpd: vote.contestant.asalSkpd,
      fotoPath: vote.contestant.fotoPath,
    },
  });
}
