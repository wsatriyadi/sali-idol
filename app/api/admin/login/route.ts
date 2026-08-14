import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { sha256 } from "@/lib/hash";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username dan password wajib diisi" },
      { status: 400 }
    );
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  const ok = admin && (await bcrypt.compare(password, admin.passwordHash));

  if (!ok) {
    await prisma.auditLog
      .create({
        data: { action: "LOGIN_FAILED", ipHash: sha256(ip), reason: username },
      })
      .catch(() => {});
    return NextResponse.json(
      { error: "Username atau password salah" },
      { status: 401 }
    );
  }

  const token = await createSession({ adminId: admin.id, username: admin.username });
  setSessionCookie(token);

  await prisma.auditLog
    .create({ data: { action: "LOGIN_SUCCESS", ipHash: sha256(ip) } })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
