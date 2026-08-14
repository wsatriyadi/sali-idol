import { prisma } from "@/lib/db";
import { formatWita, isVotingOpen } from "@/lib/time";
import VoteClient, { type ContestantCard } from "@/components/VoteClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let contestants: ContestantCard[] = [];
  let eventTitle = "SALI IDOL";
  let headerImage: string | null = null;
  let deadline: Date | null = null;
  let turnstileSiteKey: string | undefined =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  try {
    const [rows, setting] = await Promise.all([
      prisma.contestant.findMany({
        where: { isActive: true },
        orderBy: { noUrut: "asc" },
      }),
      prisma.setting.findUnique({ where: { id: 1 } }),
    ]);
    contestants = rows.map((c) => ({
      id: c.id,
      noUrut: c.noUrut,
      nama: c.nama,
      laguWajib: c.laguWajib,
      laguBebas: c.laguBebas,
      asalSkpd: c.asalSkpd,
      fotoPath: c.fotoPath,
    }));
    if (setting) {
      eventTitle = setting.eventTitle;
      headerImage = setting.headerImagePath;
      deadline = setting.voteDeadline;
      if (setting.turnstileSiteKey) turnstileSiteKey = setting.turnstileSiteKey;
    }
  } catch (e) {
    console.error("Gagal muat data:", e);
  }

  const votingOpen = isVotingOpen(deadline);
  const deadlineText = deadline ? formatWita(deadline) : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl">
      <header className="relative overflow-hidden">
        {headerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headerImage}
            alt={eventTitle}
            className="w-full object-contain"
          />
        ) : (
          <>
            <div className="h-40 w-full bg-gradient-to-br from-brand-700 via-brand-600 to-night-900" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <h1 className="text-3xl font-black tracking-tight drop-shadow">
                {eventTitle}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Pilih penyanyi favoritmu
              </p>
            </div>
          </>
        )}
      </header>

      <div className="py-4">
        <VoteClient
          contestants={contestants}
          votingOpen={votingOpen}
          deadlineText={deadlineText}
          turnstileSiteKey={turnstileSiteKey}
        />
      </div>
    </main>
  );
}
