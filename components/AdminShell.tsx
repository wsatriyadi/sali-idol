"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/peserta", label: "Peserta", icon: "🎤" },
  { href: "/admin/voting", label: "List Voting", icon: "🗳️" },
  { href: "/admin/undian", label: "Undian", icon: "🎲" },
  { href: "/admin/pemenang", label: "Pemenang", icon: "🏆" },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: "⚙️" },
];

export default function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-night-950 text-white lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-night-900 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            🎤
          </span>
          <div>
            <p className="text-sm font-black leading-none">SALI IDOL</p>
            <p className="text-xs text-white/40">Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive(n.href)
                  ? "bg-brand-600 font-semibold"
                  : "text-white/60 hover:bg-white/5"
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-3">
          <p className="px-3 text-xs text-white/40">Masuk sebagai</p>
          <p className="px-3 text-sm font-semibold">{username}</p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-xl bg-white/5 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Konten */}
      <div className="flex-1">
        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-white/10 bg-night-900 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              🎤
            </span>
            <span className="font-black">SALI IDOL</span>
          </div>
          <button onClick={logout} className="text-sm text-white/60">
            Keluar
          </button>
        </header>

        <main className="p-4 pb-24 lg:p-8">{children}</main>

        {/* Bottom nav mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-night-900/95 backdrop-blur lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive(n.href) ? "text-brand-400" : "text-white/50"
              }`}
            >
              <span className="text-base">{n.icon}</span>
              {n.label.split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
