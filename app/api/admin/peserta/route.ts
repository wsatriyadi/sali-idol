import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.contestant.findMany({
    orderBy: { noUrut: "asc" },
    include: { _count: { select: { votes: true } } },
  });
  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      noUrut: c.noUrut,
      nama: c.nama,
      laguWajib: c.laguWajib,
      laguBebas: c.laguBebas,
      asalSkpd: c.asalSkpd,
      fotoPath: c.fotoPath,
      isActive: c.isActive,
      votes: c._count.votes,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const nama = String(form.get("nama") || "").trim();
    const noUrut = parseInt(String(form.get("noUrut") || ""), 10);
    const laguWajib = String(form.get("laguWajib") || "").trim();
    const laguBebas = String(form.get("laguBebas") || "").trim();
    const asalSkpd = String(form.get("asalSkpd") || "").trim();
    const foto = form.get("foto") as File | null;

    if (!nama || !noUrut || !laguWajib || !laguBebas || !asalSkpd) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    const fotoPath = await saveUpload(foto, "peserta");

    const created = await prisma.contestant.create({
      data: { nama, noUrut, laguWajib, laguBebas, asalSkpd, fotoPath },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Nomor urut sudah dipakai" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: e?.message || "Gagal menambah peserta" },
      { status: 500 }
    );
  }
}
