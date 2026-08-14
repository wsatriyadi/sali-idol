# Aturan dan Mekanisme Platform Voting

## 1. Tujuan

Dokumen ini mendefinisikan mekanisme keamanan dan pencegahan voting
ganda pada platform voting berbasis web tanpa menggunakan OTP email
maupun OTP SMS.

Tujuan utama:

-   Membatasi setiap pemilih agar hanya dapat melakukan voting sesuai
    aturan yang ditetapkan.
-   Mengurangi kemungkinan voting otomatis/bot.
-   Mendeteksi percobaan voting berulang dari perangkat atau identitas
    yang sama.
-   Menjaga pengalaman pengguna tetap sederhana tanpa OTP email/SMS.
-   Menyediakan audit trail untuk pemeriksaan dan investigasi.

> **Catatan penting:** Sistem berbasis web tidak dapat menjamin secara
> absolut bahwa satu perangkat fisik hanya dapat melakukan satu voting.
> Cookie dapat dihapus, browser dapat diganti, perangkat dapat di-reset,
> dan fingerprint dapat berubah. Oleh karena itu, sistem menggunakan
> beberapa lapisan pengamanan sekaligus.

------------------------------------------------------------------------

# 2. Prinsip Utama

Sistem tidak boleh menggunakan satu indikator sebagai satu-satunya dasar
untuk menentukan apakah seseorang sudah voting.

Identitas voting harus dinilai menggunakan beberapa parameter:

1.  Device ID
2.  Browser fingerprint
3.  Cookie
4.  IP address / IP hash
5.  User-Agent
6.  Cloudflare Turnstile
7.  Identitas pengguna, jika voting bersifat internal

Semakin banyak lapisan yang digunakan, semakin sulit melakukan voting
berulang secara massal.

------------------------------------------------------------------------

# 3. Device ID

Ketika pengguna pertama kali membuka platform, sistem membuat identifier
unik untuk browser/perangkat.

Contoh:

``` text
device_id = 7f3c9e2a-xxxx-xxxx-xxxx-xxxxxxxx
```

Device ID dapat disimpan menggunakan:

-   Secure Cookie
-   Local Storage
-   IndexedDB

Server harus menyimpan representasi device ID yang diperlukan untuk
proses validasi.

### Aturan

-   Device ID dibuat secara otomatis.
-   Device ID tidak boleh dibuat berdasarkan NIP atau data pribadi
    secara langsung.
-   Device ID tidak boleh menjadi satu-satunya mekanisme
    anti-voting-ganda.
-   Jika Device ID hilang atau berubah, sistem tetap melakukan
    pemeriksaan fingerprint dan indikator lainnya.

------------------------------------------------------------------------

# 4. Browser / Device Fingerprint

Sistem dapat menggunakan browser fingerprint untuk mengenali
karakteristik perangkat/browser.

Contoh library:

``` text
FingerprintJS
```

Fingerprint dapat digunakan untuk menghasilkan identifier seperti:

``` text
fingerprint_hash = 8d92a7c1...
```

Server menyimpan hash fingerprint, bukan data mentah yang tidak
diperlukan.

### Tujuan

Fingerprint digunakan untuk mendeteksi kondisi seperti:

``` text
Cookie lama dihapus
        ↓
Device ID baru
        ↓
Fingerprint masih sama
        ↓
Server mendeteksi kemungkinan perangkat yang sama
```

### Catatan

Fingerprint tidak boleh dianggap sebagai identitas absolut karena:

-   Browser dapat berubah.
-   Browser privacy feature dapat mengurangi akurasi fingerprint.
-   Beberapa perangkat dapat memiliki karakteristik yang mirip.
-   Fingerprint dapat berubah setelah update browser atau perubahan
    konfigurasi.

------------------------------------------------------------------------

# 5. Cookie

Cookie digunakan sebagai salah satu lapisan identifikasi.

Contoh:

``` text
voting_device_id
```

Cookie sebaiknya menggunakan konfigurasi keamanan:

``` text
Secure
HttpOnly
SameSite
```

Jika memungkinkan, cookie identitas voting sebaiknya tidak menyimpan
informasi sensitif secara langsung.

Cookie hanya merupakan salah satu indikator dan tidak boleh menjadi
satu-satunya mekanisme pembatasan voting.

------------------------------------------------------------------------

# 6. Cloudflare Turnstile

Setiap proses voting harus melewati verifikasi Cloudflare Turnstile.

Alur:

``` text
User
  ↓
Voting Page
  ↓
Cloudflare Turnstile
  ↓
Voting API
  ↓
Server melakukan verifikasi token
  ↓
Vote diproses
```

Server wajib melakukan validasi token Turnstile.

Token tidak boleh hanya dipercaya berdasarkan hasil dari browser/client.

### Tujuan

Turnstile digunakan untuk mengurangi:

-   Bot
-   Automated voting
-   Script otomatis
-   Spam request
-   Abuse terhadap API

Turnstile bukan pengganti mekanisme identitas voting.

------------------------------------------------------------------------

# 7. Rate Limiting

Voting API harus memiliki rate limiting.

Contoh:

``` text
POST /api/vote

Maximum:
10 request / menit / IP
```

Nilai rate limit dapat disesuaikan dengan kebutuhan.

Rate limit digunakan untuk mencegah:

-   Brute force
-   Spam voting
-   Automated request
-   Serangan terhadap endpoint voting

## Penting

IP address tidak boleh digunakan sebagai satu-satunya identitas pemilih.

Contoh:

``` text
Kantor / Rumah Sakit
        ↓
1 Public IP
        ↓
100 pengguna
```

Jika aturan dibuat:

``` text
1 IP = 1 vote
```

maka pengguna lain dalam jaringan yang sama akan ikut terblokir.

Karena itu IP digunakan sebagai **indikator risiko**, bukan identitas
utama.

------------------------------------------------------------------------

# 8. Database Voting

Database harus memiliki struktur yang memungkinkan sistem mencegah
duplikasi voting.

Contoh tabel:

``` text
votes
------------------------------------------------
id
user_id
candidate_id
category_id
device_id_hash
fingerprint_hash
ip_hash
user_agent_hash
turnstile_verified
created_at
```

Untuk voting internal berbasis akun, gunakan database constraint.

Contoh:

``` sql
UNIQUE(user_id, category_id)
```

Dengan demikian:

``` text
1 user
  +
1 category
  =
1 vote
```

Database menjadi lapisan terakhir untuk memastikan voting ganda tidak
dapat masuk walaupun terdapat bug pada sisi aplikasi.

------------------------------------------------------------------------

# 9. Prioritas Identitas Voting

Untuk sistem voting internal, identitas pengguna sebaiknya
diprioritaskan sebagai berikut:

``` text
1. User Account / NIP
2. Database Unique Constraint
3. Device ID
4. Browser Fingerprint
5. Cookie
6. IP / IP Hash
7. User-Agent
8. Turnstile
```

User account dan database constraint merupakan mekanisme utama.

Device fingerprint, cookie, IP, dan Turnstile merupakan lapisan mitigasi
abuse.

------------------------------------------------------------------------

# 10. Sistem Voting Internal Pegawai

Jika platform digunakan untuk pemilihan internal pegawai, metode yang
lebih direkomendasikan adalah:

``` text
NIP + Password
```

atau menggunakan:

``` text
NIP + Kode Akses Unik
```

tanpa OTP.

Contoh:

``` text
NIP:
199103242024212022

Kode Akses:
SALI-7F82-K9X2
```

Kode akses dibuat unik untuk setiap pegawai dan tidak boleh digunakan
oleh pegawai lain.

------------------------------------------------------------------------

# 11. Alur Voting Internal

``` text
User membuka website
        ↓
Login NIP + Password / Kode Akses
        ↓
Validasi akun
        ↓
Cloudflare Turnstile
        ↓
Cek status voting
        ↓
Cek device/fingerprint
        ↓
User memilih kandidat
        ↓
Submit Vote
        ↓
Server validasi ulang
        ↓
Database Unique Constraint
        ↓
Simpan Vote
        ↓
Catat Audit Log
        ↓
Voting berhasil
```

------------------------------------------------------------------------

# 12. Validasi Sebelum Voting

Server harus melakukan pemeriksaan sebelum menyimpan vote.

Minimal:

``` text
1. Session valid?
2. User valid?
3. Turnstile valid?
4. Apakah user sudah voting?
5. Apakah kategori masih aktif?
6. Apakah kandidat masih aktif?
7. Apakah request memenuhi rate limit?
8. Apakah device/fingerprint menunjukkan aktivitas mencurigakan?
9. Apakah database constraint mengizinkan vote?
```

Jika salah satu pemeriksaan kritis gagal, vote tidak boleh disimpan.

------------------------------------------------------------------------

# 13. Validasi Saat Submit

Jangan mengandalkan pemeriksaan dari frontend.

Contoh yang tidak aman:

``` javascript
if (!hasVoted) {
    submitVote();
}
```

Frontend dapat dimanipulasi.

Server harus melakukan validasi:

``` text
POST /api/vote
        ↓
Authenticate
        ↓
Validate Turnstile
        ↓
Check voting period
        ↓
Check user eligibility
        ↓
Check duplicate vote
        ↓
Check rate limit
        ↓
Insert vote
```

------------------------------------------------------------------------

# 14. Database Constraint

Pencegahan voting ganda harus dilakukan di database, bukan hanya di kode
aplikasi.

Contoh:

``` sql
CREATE UNIQUE INDEX unique_user_category_vote
ON votes(user_id, category_id);
```

Jika pengguna mencoba voting kedua:

``` text
User ID: 123
Category: 1
```

dan data tersebut sudah ada, database harus menolak insert.

Ini penting untuk mencegah race condition.

Contoh:

``` text
Request A ─────┐
               ├──> Server
Request B ─────┘
```

Kedua request dapat datang hampir bersamaan.

Database unique constraint memastikan hanya satu yang berhasil.

------------------------------------------------------------------------

# 15. Audit Log

Setiap aktivitas voting penting harus dicatat.

Contoh:

``` text
audit_logs
------------------------------------------------
id
user_id
action
candidate_id
category_id
device_id_hash
fingerprint_hash
ip_hash
user_agent_hash
result
reason
created_at
```

Contoh aktivitas:

``` text
LOGIN_SUCCESS
LOGIN_FAILED
VOTE_ATTEMPT
VOTE_SUCCESS
VOTE_REJECTED
DUPLICATE_VOTE
TURNSTILE_FAILED
RATE_LIMITED
SUSPICIOUS_DEVICE
```

Audit log digunakan untuk pemeriksaan keamanan dan tidak boleh mudah
dihapus oleh pengguna biasa.

------------------------------------------------------------------------

# 16. Penanganan Percobaan Voting Ganda

Jika user telah voting:

``` text
Vote sebelumnya ditemukan
        ↓
Tolak request
        ↓
Catat audit log
        ↓
Tampilkan pesan
```

Contoh pesan:

``` text
Anda sudah menggunakan hak suara untuk kategori ini.
```

Jangan menampilkan detail teknis seperti:

``` text
Fingerprint Anda sudah terdaftar.
IP Anda sudah digunakan.
Device ID Anda sudah voting.
```

Informasi tersebut dapat membantu seseorang melakukan bypass.

------------------------------------------------------------------------

# 17. Penilaian Risiko

Sistem dapat menggunakan risk scoring.

Contoh:

``` text
Device baru                  +0
Fingerprint baru             +0
IP normal                    +0
Turnstile valid              +0

Device sudah pernah voting   +50
Fingerprint sudah voting     +50
IP sangat mencurigakan       +20
Rate limit terlampaui        +50
Turnstile gagal              +100
```

Contoh keputusan:

``` text
Score 0-49
→ Normal

Score 50-99
→ Review / pembatasan

Score >= 100
→ Reject
```

Nilai di atas hanya contoh dan harus disesuaikan dengan kondisi nyata.

------------------------------------------------------------------------

# 18. Jangan Menggunakan IP sebagai "1 Device"

Metode berikut tidak direkomendasikan:

``` text
if IP sudah voting:
    reject
```

Karena:

-   Banyak user dapat menggunakan satu IP.
-   Jaringan kantor biasanya menggunakan NAT.
-   Jaringan seluler dapat menggunakan shared IP.
-   IP dapat berubah.
-   VPN dapat mengganti IP.

IP lebih tepat digunakan sebagai indikator abuse.

------------------------------------------------------------------------

# 19. Jangan Menggunakan Cookie Saja

Metode berikut tidak cukup:

``` text
Cookie:
voted=true
```

Karena pengguna dapat:

-   Menghapus cookie.
-   Menggunakan mode incognito.
-   Menggunakan browser lain.
-   Menggunakan perangkat lain.

Cookie harus dikombinasikan dengan mekanisme lain.

------------------------------------------------------------------------

# 20. Jangan Menganggap Fingerprint 100% Aman

Fingerprint dapat membantu, tetapi bukan solusi absolut.

Jangan membuat aturan:

``` text
Fingerprint sama = pasti orang yang sama
```

Gunakan fingerprint sebagai salah satu sinyal keamanan.

Untuk voting internal, identitas akun/NIP tetap lebih kuat.

------------------------------------------------------------------------

# 21. Rekomendasi Arsitektur

Untuk platform voting internal:

``` text
                   ┌──────────────┐
                   │    User      │
                   └──────┬───────┘
                          │
                          ↓
                   ┌──────────────┐
                   │  Cloudflare  │
                   │ WAF + Rate   │
                   └──────┬───────┘
                          │
                          ↓
                   ┌──────────────┐
                   │  Turnstile   │
                   └──────┬───────┘
                          │
                          ↓
                   ┌──────────────┐
                   │   Voting API │
                   └──────┬───────┘
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
         User Auth    Device/Fp    Rate Limit
             │            │            │
             └────────────┼────────────┘
                          ↓
                   ┌──────────────┐
                   │   Database   │
                   │ Unique Vote  │
                   └──────┬───────┘
                          │
                          ↓
                   ┌──────────────┐
                   │  Audit Log   │
                   └──────────────┘
```

------------------------------------------------------------------------

# 22. Rekomendasi Implementasi untuk Voting Pegawai

Jika digunakan untuk pemilihan pegawai seperti Pegawai Teladan,
konfigurasi yang direkomendasikan:

### Identitas

``` text
NIP + Password
```

atau:

``` text
NIP + Unique Access Code
```

### Anti-bot

``` text
Cloudflare Turnstile
```

### Anti-abuse

``` text
Rate Limiting
IP Reputation
Device ID
Browser Fingerprint
```

### Pencegahan voting ganda

``` text
Database UNIQUE Constraint
```

### Monitoring

``` text
Audit Log
Admin Dashboard
Suspicious Activity Dashboard
```

### Tidak diperlukan

``` text
OTP Email
OTP SMS
```

------------------------------------------------------------------------

# 23. Prinsip Keamanan Utama

Urutan kekuatan mekanisme:

``` text
IDENTITAS USER
      ↓
DATABASE CONSTRAINT
      ↓
TURNSTILE
      ↓
DEVICE ID
      ↓
FINGERPRINT
      ↓
COOKIE
      ↓
IP / RATE LIMIT
```

Jangan membalik prinsip ini dengan menjadikan IP atau cookie sebagai
identitas utama.

------------------------------------------------------------------------

# 24. Kesimpulan

Untuk sistem voting web tanpa OTP email dan SMS, pendekatan yang
direkomendasikan adalah **multi-layer protection**.

Untuk voting publik:

``` text
Device ID
+
Fingerprint
+
Cookie
+
IP Risk
+
Rate Limiting
+
Cloudflare Turnstile
+
Database Constraint
```

Untuk voting internal pegawai:

``` text
NIP / User Account
+
Database Unique Constraint
+
Device ID
+
Fingerprint
+
Cloudflare Turnstile
+
Rate Limiting
+
Audit Log
```

Metode kedua lebih disarankan apabila tujuan sebenarnya adalah
memastikan:

> **Satu pegawai hanya dapat memberikan satu suara per kategori.**

Dengan pendekatan ini, pengguna tidak perlu menerima OTP melalui email
atau SMS, tetapi sistem tetap memiliki beberapa lapisan perlindungan
terhadap voting ganda dan bot.
