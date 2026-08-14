-- SALI IDOL — D1 schema (SQLite)

CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contestants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  no_urut    INTEGER NOT NULL UNIQUE,
  nama       TEXT NOT NULL,
  lagu_wajib TEXT NOT NULL,
  lagu_bebas TEXT NOT NULL,
  asal_skpd  TEXT NOT NULL,
  foto_key   TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS votes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_name     TEXT NOT NULL,
  voter_whatsapp TEXT NOT NULL UNIQUE,   -- 1 nomor WhatsApp = 1 vote
  contestant_id  INTEGER NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  kode_undian    TEXT NOT NULL UNIQUE,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_votes_contestant ON votes(contestant_id);

CREATE TABLE IF NOT EXISTS undian_draws (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_id  INTEGER NOT NULL UNIQUE REFERENCES votes(id) ON DELETE CASCADE,
  drawn_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  header_key    TEXT,
  favicon_key   TEXT,
  event_title   TEXT NOT NULL DEFAULT 'SALI IDOL',
  vote_deadline TEXT,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings singleton
INSERT OR IGNORE INTO settings (id, event_title) VALUES (1, 'SALI IDOL');

-- Peserta contoh (hanya jika kosong)
INSERT OR IGNORE INTO contestants (no_urut, nama, lagu_wajib, lagu_bebas, asal_skpd) VALUES
  (1, 'Rani Puspita', 'Indonesia Pusaka', 'Kali Kedua', 'Dinas Pendidikan'),
  (2, 'Budi Santoso', 'Rayuan Pulau Kelapa', 'Hati-Hati di Jalan', 'Dinas Kesehatan'),
  (3, 'Sarah Wijaya', 'Tanah Airku', 'Melukis Senja', 'Bappeda');

-- Admin default di-seed via skrip terpisah (seed-admin.mjs) karena hash PBKDF2
-- dihitung di JS. Jalankan: node seed-admin.mjs admin <password> >> seed-admin.sql
