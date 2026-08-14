import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { generateKodeUndian } from "@/lib/kode-undian";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isVotingOpen } from "@/lib/time";

const RATE_LIMIT = parseInt(process.env.VOTE_RATE_LIMIT_PER_MIN || "10", 10);

async function audit(data: {
  action: string;
  contestantId?: number | null;
  deviceIdHash?: string;
  fingerprintHash?: string;
  ipHash?: string;
  userAgentHash?: string;
  result?: string;
  reason?: string;
}) {
  try {
    await prisma.auditLog.create({ data });
  } catch {
    /* jangan sampai audit gagal menggagalkan vote */
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const ipHash = sha256(ip);
  const userAgentHash = sha256(userAgent);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid" }, { status: 400 });
  }

  const {
    contestantId,
    voterName,
    voterWhatsapp,
    deviceId,
    fingerprint,
    turnstileToken,
    fcmToken,
  } = body || {};

  // Validasi input dasar
  if (!contestantId || !voterName?.trim() || !deviceId || !fingerprint) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  let whatsapp = String(voterWhatsapp || "").replace(/\D/g, "");
  if (whatsapp.length < 9 || whatsapp.length > 15) {
    return NextResponse.json(
      { error: "Nomor WhatsApp tidak valid" },
      { status: 400 }
    );
  }
  // Normalisasi ke format internasional (Indonesia): 0xxx -> 62xxx
  if (whatsapp.startsWith("0")) whatsapp = "62" + whatsapp.slice(1);

  const deviceIdHash = sha256(String(deviceId));
  const fingerprintHash = sha256(String(fingerprint));

  await audit({
    action: "VOTE_ATTEMPT",
    contestantId: Number(contestantId),
    deviceIdHash,
    fingerprintHash,
    ipHash,
    userAgentHash,
  });

  // 1. Rate limit per IP (§7)
  const rl = rateLimit(`vote:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    await audit({ action: "RATE_LIMITED", ipHash, result: "REJECTED" });
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 }
    );
  }

  // Ambil pengaturan (secret Turnstile + deadline)
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });

  // 2. Verifikasi Turnstile WAJIB (§6, §13) — secret dari pengaturan/DB
  const turnstileOk = await verifyTurnstile(
    turnstileToken,
    ip,
    setting?.turnstileSecretKey
  );
  if (!turnstileOk) {
    await audit({
      action: "TURNSTILE_FAILED",
      deviceIdHash,
      ipHash,
      result: "REJECTED",
    });
    return NextResponse.json(
      { error: "Verifikasi keamanan gagal. Muat ulang halaman." },
      { status: 400 }
    );
  }

  // 3. Cek periode voting (§12)
  if (!isVotingOpen(setting?.voteDeadline ?? null)) {
    await audit({ action: "VOTE_REJECTED", ipHash, reason: "PERIOD_CLOSED" });
    return NextResponse.json(
      { error: "Periode voting telah berakhir." },
      { status: 403 }
    );
  }

  // 4. Cek kandidat aktif
  const contestant = await prisma.contestant.findUnique({
    where: { id: Number(contestantId) },
  });
  if (!contestant || !contestant.isActive) {
    return NextResponse.json(
      { error: "Peserta tidak ditemukan." },
      { status: 404 }
    );
  }

  // 5. Cek duplikat multi-layer (§16) — pesan generic, jangan bocor teknis
  const existing = await prisma.vote.findFirst({
    where: {
      OR: [{ deviceIdHash }, { fingerprintHash }],
    },
  });
  if (existing) {
    await audit({
      action: "DUPLICATE_VOTE",
      deviceIdHash,
      fingerprintHash,
      ipHash,
      result: "REJECTED",
      reason: existing.deviceIdHash === deviceIdHash ? "DEVICE" : "FINGERPRINT",
    });
    return NextResponse.json(
      { error: "Anda sudah menggunakan hak suara." },
      { status: 409 }
    );
  }

  // 6. Generate kode undian unik + insert (DB UNIQUE = backstop race condition §14)
  for (let attempt = 0; attempt < 5; attempt++) {
    const kodeUndian = generateKodeUndian();
    try {
      const vote = await prisma.vote.create({
        data: {
          voterName: String(voterName).trim().slice(0, 60),
          voterWhatsapp: whatsapp,
          contestantId: contestant.id,
          kodeUndian,
          deviceIdHash,
          fingerprintHash,
          ipHash,
          userAgentHash,
          turnstileVerified: true,
          fcmToken: fcmToken ? String(fcmToken) : null,
        },
      });
      await audit({
        action: "VOTE_SUCCESS",
        contestantId: contestant.id,
        deviceIdHash,
        fingerprintHash,
        ipHash,
        userAgentHash,
        result: "SUCCESS",
      });
      return NextResponse.json({ kodeUndian: vote.kodeUndian });
    } catch (e: any) {
      // P2002 = unique constraint. Bisa dari device_id_hash (race) atau kode_undian.
      if (e?.code === "P2002") {
        const target = String(e?.meta?.target || "");
        if (target.includes("kode_undian")) {
          // kolisi kode undian → coba lagi dengan kode baru
          continue;
        }
        // duplikat device_id_hash (race condition) → tolak
        await audit({
          action: "DUPLICATE_VOTE",
          deviceIdHash,
          fingerprintHash,
          ipHash,
          result: "REJECTED",
          reason: "RACE",
        });
        return NextResponse.json(
          { error: "Anda sudah menggunakan hak suara." },
          { status: 409 }
        );
      }
      console.error("Insert vote error:", e);
      return NextResponse.json(
        { error: "Gagal menyimpan suara. Coba lagi." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Gagal membuat kode undian. Coba lagi." },
    { status: 500 }
  );
}
