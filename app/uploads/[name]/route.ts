import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join, basename, extname } from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

/** Serve file upload dari disk (next start tidak serve file yang dibuat setelah build). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  // Cegah path traversal — hanya basename
  const name = basename(params.name || "");
  if (!name || name.startsWith(".")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = join(UPLOAD_DIR, name);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });

    const buf = await readFile(filePath);
    const ext = extname(name).toLowerCase();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
