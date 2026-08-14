import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/upload";
import { witaLocalStringToUtc, utcToWitaLocalString } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await prisma.setting.findUnique({ where: { id: 1 } });
  return NextResponse.json({
    eventTitle: s?.eventTitle || "SALI IDOL",
    headerImagePath: s?.headerImagePath || null,
    faviconPath: s?.faviconPath || null,
    voteDeadlineWita: s?.voteDeadline
      ? utcToWitaLocalString(s.voteDeadline)
      : "",
    turnstileSiteKey: s?.turnstileSiteKey || "",
    turnstileSecretKey: s?.turnstileSecretKey || "",
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const data: any = {};

    const eventTitle = form.get("eventTitle");
    if (eventTitle !== null && String(eventTitle).trim()) {
      data.eventTitle = String(eventTitle).trim();
    }

    const deadline = form.get("voteDeadlineWita");
    if (deadline !== null) {
      const v = String(deadline).trim();
      data.voteDeadline = v ? witaLocalStringToUtc(v) : null;
    }

    const tsSite = form.get("turnstileSiteKey");
    if (tsSite !== null) data.turnstileSiteKey = String(tsSite).trim() || null;
    const tsSecret = form.get("turnstileSecretKey");
    if (tsSecret !== null)
      data.turnstileSecretKey = String(tsSecret).trim() || null;

    const header = form.get("headerImage") as File | null;
    const headerPath = await saveUpload(header, "header");
    if (headerPath) data.headerImagePath = headerPath;

    const favicon = form.get("favicon") as File | null;
    const faviconPath = await saveUpload(favicon, "favicon");
    if (faviconPath) data.faviconPath = faviconPath;

    await prisma.setting.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal menyimpan pengaturan" },
      { status: 500 }
    );
  }
}
