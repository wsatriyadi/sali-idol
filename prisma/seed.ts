import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  // Bootstrap admin
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash },
  });
  console.log(`✓ Admin siap: ${username}`);

  // Settings singleton row
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, eventTitle: "SALI IDOL" },
  });
  console.log("✓ Settings row siap");

  // Contoh peserta (hanya jika kosong)
  const count = await prisma.contestant.count();
  if (count === 0) {
    await prisma.contestant.createMany({
      data: [
        {
          noUrut: 1,
          nama: "Rani Puspita",
          laguWajib: "Indonesia Pusaka",
          laguBebas: "Kali Kedua",
          asalSkpd: "Dinas Pendidikan",
        },
        {
          noUrut: 2,
          nama: "Budi Santoso",
          laguWajib: "Rayuan Pulau Kelapa",
          laguBebas: "Hati-Hati di Jalan",
          asalSkpd: "Dinas Kesehatan",
        },
        {
          noUrut: 3,
          nama: "Sarah Wijaya",
          laguWajib: "Tanah Airku",
          laguBebas: "Melukis Senja",
          asalSkpd: "Bappeda",
        },
      ],
    });
    console.log("✓ 3 peserta contoh dibuat");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
