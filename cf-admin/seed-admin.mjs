// Generate SQL INSERT untuk admin dengan hash PBKDF2 (format sama dgn Functions).
// Pakai: node seed-admin.mjs <username> <password>
// Output: statement SQL → pipe ke wrangler d1 execute.

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node seed-admin.mjs <username> <password>");
  process.exit(1);
}

const enc = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString("base64");

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
  key,
  256
);
const hash = `pbkdf2$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`;
const safe = username.replace(/'/g, "''");

console.log(
  `INSERT OR REPLACE INTO admins (id, username, password_hash) VALUES ` +
    `((SELECT id FROM admins WHERE username='${safe}'), '${safe}', '${hash}');`
);
