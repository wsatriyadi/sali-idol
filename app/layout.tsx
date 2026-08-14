import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  let title = "SALI IDOL — Voting";
  let favicon: string | undefined;
  try {
    const s = await prisma.setting.findUnique({ where: { id: 1 } });
    if (s?.eventTitle) title = `${s.eventTitle} — Voting`;
    if (s?.faviconPath) favicon = s.faviconPath;
  } catch {
    /* DB belum siap */
  }
  return {
    title,
    description: "Platform voting publik kontes menyanyi SALI IDOL",
    icons: favicon ? { icon: favicon } : undefined,
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0c0a17",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-night-950 text-white antialiased">{children}</body>
    </html>
  );
}
