import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body || {};
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Password lama dan baru wajib diisi" },
      { status: 400 }
    );
  }
  if (String(newPassword).length < 6) {
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter" },
      { status: 400 }
    );
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
  });
  if (!admin || !(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    return NextResponse.json({ error: "Password lama salah" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
