import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/upload";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  try {
    const form = await req.formData();
    const data: any = {};
    const nama = form.get("nama");
    const noUrut = form.get("noUrut");
    const laguWajib = form.get("laguWajib");
    const laguBebas = form.get("laguBebas");
    const asalSkpd = form.get("asalSkpd");
    const isActive = form.get("isActive");
    const foto = form.get("foto") as File | null;

    if (nama !== null) data.nama = String(nama).trim();
    if (noUrut !== null) data.noUrut = parseInt(String(noUrut), 10);
    if (laguWajib !== null) data.laguWajib = String(laguWajib).trim();
    if (laguBebas !== null) data.laguBebas = String(laguBebas).trim();
    if (asalSkpd !== null) data.asalSkpd = String(asalSkpd).trim();
    if (isActive !== null) data.isActive = String(isActive) === "true";

    const fotoPath = await saveUpload(foto, "peserta");
    if (fotoPath) data.fotoPath = fotoPath;

    await prisma.contestant.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Nomor urut sudah dipakai" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: e?.message || "Gagal memperbarui" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  try {
    await prisma.contestant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal menghapus" },
      { status: 500 }
    );
  }
}
