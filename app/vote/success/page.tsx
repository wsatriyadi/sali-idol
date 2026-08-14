import Link from "next/link";

export const dynamic = "force-dynamic";

export default function VoteSuccessPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = searchParams.code || "----‑----";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-5xl">
        ✅
      </div>
      <h1 className="text-2xl font-black">Terima kasih!</h1>
      <p className="mt-2 text-white/60">
        Suara Anda berhasil direkam. Simpan kode undian di bawah — Anda ikut
        undian doorprize.
      </p>

      <div className="mt-8 w-full max-w-xs rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 shadow-xl shadow-brand-600/30">
        <p className="text-xs uppercase tracking-widest text-white/70">
          Kode Undian Anda
        </p>
        <p className="mt-2 select-all font-mono text-4xl font-black tracking-widest">
          {code}
        </p>
      </div>

      <p className="mt-6 text-sm text-white/50">
        Jika Anda memenangkan undian, notifikasi akan dikirim ke browser ini.
        Pastikan izin notifikasi aktif.
      </p>

      <Link
        href="/"
        className="mt-8 rounded-xl bg-white/5 px-6 py-3 font-semibold text-white/70 ring-1 ring-white/10 active:scale-95"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
