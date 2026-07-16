# Chonk Game — Setup Guide (Telegram Mini App + Vercel + Supabase)

## Struktur project
```
chonk/
├── public/              # frontend statis, di-serve Vercel
│   ├── index.html
│   ├── css/style.css
│   ├── js/{game.js, audio.js, ui.js, leaderboard.js, streak.js}
│   └── assets/images/*.png,*.jpg
├── api/                 # Vercel Serverless Functions
│   ├── leaderboard.js   # GET — baca leaderboard (read-only, pakai anon key)
│   ├── submit-score.js  # POST — validasi Telegram + anti-cheat, insert pakai SERVICE key
│   ├── streak.js        # POST — daily streak & XP (terpisah dari skor game)
│   └── _lib/verifyTelegram.js  # helper verifikasi signature initData Telegram
├── supabase/schema.sql   # migrasi database (jalankan sekali di Supabase SQL Editor)
├── vercel.json
├── package.json
└── .env.example          # contoh env vars, copy ke .env untuk dev lokal
```

## 1. Setup Supabase (database)

Project Supabase yang lama TETAP DIPAKAI (data leaderboard existing tidak hilang/reset).

1. Login ke https://supabase.com/dashboard, buka project yang sudah ada.
2. Buka **SQL Editor** → **New query**.
3. Copy-paste seluruh isi file `supabase/schema.sql`, klik **Run**.
   - Ini nambahin kolom `country` & `telegram_id` ke tabel `leaderboard` (kolom `country`
     sebelumnya dipanggil kode tapi belum ada di DB — bug lama, sekarang diperbaiki).
   - Bikin tabel baru `rate_limits` (anti-spam) dan `streaks` (daily XP).
   - Mengaktifkan Row Level Security supaya database HANYA bisa ditulis lewat backend
     `/api/*` (pakai service key), bukan langsung dari browser lagi.
4. Ambil 3 nilai ini dari **Settings → API**:
   - `Project URL` → jadi `SUPABASE_URL`
   - `anon public` key → jadi `SUPABASE_ANON_KEY`
   - `service_role` key → jadi `SUPABASE_SERVICE_KEY` (⚠️ SANGAT RAHASIA, jangan share ke siapapun)

## 2. Setup Bot Token Telegram

1. Chat ke **@BotFather** di Telegram.
2. Ketik `/mybots`, pilih bot yang sudah ada.
3. Pilih **API Token** → copy token itu (ini token yang SAMA dengan yang sudah dipakai
   bot lo sekarang, tidak akan mengganggu bot yang sedang berjalan).
4. Simpan sebagai `TELEGRAM_BOT_TOKEN`.

## 3. Setup Environment Variables

### Untuk dev lokal:
```bash
cp .env.example .env
```
Isi `.env` dengan 4 value di atas (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`,
`TELEGRAM_BOT_TOKEN`).

### Untuk production (Vercel):
Jangan pernah taruh secret di file yang di-commit ke git. Set langsung di dashboard:
1. Buka project di https://vercel.com/dashboard
2. **Settings → Environment Variables**
3. Tambahkan 4 variable yang sama, scope: Production + Preview + Development.

## 4. Install & jalankan lokal

```bash
npm install -g vercel   # kalau belum ada
cd chonk
npm install
vercel dev
```
Ini akan jalanin frontend (`public/`) DAN backend (`api/*`) sekaligus di `http://localhost:3000`.

**Catatan penting**: karena game ini di-gate khusus Telegram Mini App, buka
`http://localhost:3000` langsung di browser biasa akan menampilkan layar "Please open via
Telegram" — ini BUKAN bug, itu memang sengaja (fitur keamanan yang kita diskusikan).
Untuk test gameplay beneran, pakai [BotFather test environment] atau deploy dulu ke Vercel lalu
buka link-nya lewat bot Telegram lo (Menu Button / inline button dengan `web_app` URL).

## 5. Deploy ke Vercel

```bash
vercel --prod
```
Atau lewat dashboard: **Import Project** dari GitHub repo, pilih root directory (bukan
`public/` — Vercel otomatis detect struktur `public/` + `api/` ini).

## 6. Hubungkan ke Bot Telegram (Mini App)

1. Chat ke **@BotFather** → `/mybots` → pilih bot → **Bot Settings → Menu Button**
2. Set URL ke domain Vercel lo (misal `https://chonk-game.vercel.app`)
3. Atau pakai `/newapp` untuk daftarin sebagai Mini App resmi dengan nama & short name sendiri.

## 7. Keamanan yang sudah diterapkan (3 lapis, sesuai kesepakatan)

1. **`robots.txt` / meta noindex** — mencegah Google/search engine mengindex URL Vercel.
2. **Block screen di frontend** — kalau dibuka bukan dari Telegram WebView asli (`initData`
   kosong/tidak ada), game sama sekali tidak render (canvas kosong, cuma pesan blokir).
3. **Validasi signature di backend** (`api/_lib/verifyTelegram.js`) — bahkan kalau seseorang
   berhasil bypass block screen di frontend (misal edit JS lewat DevTools), submit skor tetap
   akan DITOLAK backend karena `initData` tidak bisa dipalsukan tanpa Bot Token asli.

Tambahan anti-cheat di `submit-score.js`:
- Rate-limit per IP (maks 1 submit per 8 detik)
- Rate-limit + physics check per Telegram user ID (skor tidak boleh naik lebih cepat dari
  kemungkinan manusia bermain — dihitung dari `MIN_SECONDS_PER_POINT`)

## 8. Yang BELUM dikerjakan (sesuai kesepakatan, next phase)

- **Mint NFT** — skip, tombol belum ada sama sekali.
- **Referral code** — skip, belum ada sama sekali.
- **Connect Wallet** — tombol sudah ada di UI tapi disabled + label "SOON", belum ada fungsi.
- **Matador redesign** — skip untuk saat ini, efek jubah berkibar existing dipakai apa adanya.
- **CHONK_POWER sprite** — masih pakai gambar lama (belum diganti asset baru dari user).

## 9. Kalau mau edit assets di masa depan

Gambar sekarang file `.png`/`.jpg` biasa di `public/assets/images/` — tinggal replace file
dengan nama yang sama, tidak perlu utak-atik base64/encoding apapun lagi (beda dari versi
single-file HTML sebelumnya).
