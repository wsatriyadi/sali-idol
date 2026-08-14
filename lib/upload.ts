import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"];

/** Simpan file upload ke public/uploads, return path publik (mis. /uploads/xxx.jpg).
 *  Return null jika file kosong/invalid. */
export async function saveUpload(
  file: File | null,
  prefix = "img"
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_SIZE) throw new Error("Ukuran file melebihi 5MB");
  if (file.type && !ALLOWED.includes(file.type)) {
    throw new Error("Format file tidak didukung");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext =
    file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "png";
  const name = `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, name), buffer);

  return `/uploads/${name}`;
}
