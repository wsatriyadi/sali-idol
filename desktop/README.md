# SALI IDOL — Aplikasi Voting Desktop

Aplikasi voting berbasis desktop (Windows `.exe`), Python + tkinter. Panggil API
Cloudflare (Pages Functions + D1 + R2). Aturan **1 device = 1 vote** (hash MachineGuid).

## Alur (sama seperti web)
List peserta (foto/nama/lagu) → klik → input **Nama + WhatsApp** → "Yakin vote {nama}?"
→ **kode undian**. Buka lagi di device sama → langsung layar hasil (sudah vote).

## Jalankan (dev)
```bat
python -m pip install -r requirements.txt
python main.py
```

## Konfigurasi
`config.ini` (di samping exe / main.py):
```ini
[app]
api_base = https://<project>.pages.dev
```
Bisa juga ubah `DEFAULT_API_BASE` di `config.py`.

## Build .exe
```bat
python -m pip install -r requirements.txt
build.bat
```
Hasil: `dist\SALI-IDOL-Vote.exe`. Sertakan `config.ini` di folder yang sama bila
ingin ganti URL tanpa rebuild.

## Catatan
- Device id = SHA-256(Windows MachineGuid), fallback MAC address.
- Deadline vote & status "sudah vote" divalidasi server (D1 UNIQUE device_hash).
