# Processing AWB — PWA + Google Sheets

## Struktur folder

- `index.html` — seluruh UI, CSS, dan JavaScript aplikasi.
- `manifest.json` — konfigurasi PWA.
- `sw.js` — cache/offline app shell.
- `assets/logo-awb.png` — logo Agri Wangi Berry yang diberikan.
- `assets/icon-192.png` — ikon PWA 192 px.
- `assets/icon-512.png` — ikon PWA 512 px.
- `google-apps-script/Code.gs` — backend Google Sheets.
- `vercel.json` — konfigurasi ringan Vercel.

## 1. Siapkan Google Sheet

1. Buat satu Google Spreadsheet baru.
2. Salin Spreadsheet ID dari URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Buka **Extensions → Apps Script**.
4. Tempel isi `google-apps-script/Code.gs`.
5. Ubah:
   - `SPREADSHEET_ID: 'PASTE_SPREADSHEET_ID_HERE'`
   - `API_KEY: 'AWB_PROCESSING_2026'` jika ingin mengganti token.
6. Simpan.
7. Jalankan fungsi `setupSheets()` sekali dari editor Apps Script untuk membuat sheet `LKS`, `PANEN`, dan `KEMASAN`.
8. Berikan permission yang diminta.

### Deploy Apps Script

- **Deploy → New deployment**
- Type: **Web app**
- Execute as: **Me**
- Who has access: **Anyone**
- Deploy
- Salin URL yang berakhir `/exec`.

Jika kode Apps Script diubah setelah deployment, lakukan **Deploy → Manage deployments → Edit → New version → Deploy**.

## 2. Hubungkan PWA ke Apps Script

Buka `index.html`, cari:

```js
const SYNC_CONFIG = {
  APPS_SCRIPT_URL: 'PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',
  API_KEY: 'AWB_PROCESSING_2026',
  VERSION: '1.0.0'
};
```

Ganti `APPS_SCRIPT_URL` dengan URL `/exec` Apps Script.

`API_KEY` harus sama dengan yang ada di `Code.gs`.

## 3. Upload ke GitHub

Upload seluruh isi folder ini ke root repository GitHub, sehingga `index.html` berada di root.

Contoh:

```text
repo/
├─ index.html
├─ manifest.json
├─ sw.js
├─ vercel.json
├─ assets/
│  ├─ logo-awb.png
│  ├─ icon-192.png
│  └─ icon-512.png
└─ google-apps-script/
   └─ Code.gs
```

## 4. Deploy ke Vercel

1. Login ke Vercel.
2. **Add New → Project**.
3. Import repository GitHub.
4. Framework: **Other** / static.
5. Build Command: kosongkan.
6. Output Directory: `.`.
7. Deploy.

Setelah deploy, buka URL HTTPS Vercel tersebut. PWA dapat dipasang dari browser yang mendukung instalasi PWA.

## 5. Cara kerja offline

Aplikasi tetap menggunakan penyimpanan lokal browser untuk data kerja.

Saat user menekan **Simpan/Edit/Hapus**:

1. Data langsung disimpan lokal.
2. Jika online, perubahan masuk antrean dan dikirim ke Google Sheet.
3. Jika offline, perubahan tetap berada di antrean.
4. Saat koneksi kembali online dan aplikasi aktif, antrean dikirim otomatis.
5. Setelah antrean kosong, aplikasi menarik data dari Google Sheet agar perangkat kembali sinkron.

Aplikasi juga melakukan migrasi data lokal lama pada pembukaan pertama setelah versi sinkronisasi ini dipasang.

> Catatan: jika aplikasi benar-benar ditutup saat offline, browser tidak dijamin menjalankan sinkronisasi latar belakang. Saat aplikasi dibuka kembali dan koneksi tersedia, antrean akan diproses.

## 6. Sheet otomatis

Apps Script membuat tiga sheet bila belum ada:

- `LKS`
- `PANEN`
- `KEMASAN`

Header dibuat otomatis berdasarkan field data yang masuk. Jika pada versi berikutnya muncul field baru, kolom header baru akan ditambahkan otomatis.

Selain kolom hasil flattening, setiap baris menyimpan:

- `ID`
- `Updated_At`
- `Data_JSON`

`Data_JSON` dipakai aplikasi untuk mengambil kembali data asli dari Google Sheet.

## 7. Catatan keamanan

Web App Apps Script dengan akses `Anyone` berarti endpoint dapat diakses dari internet. `API_KEY` pada PWA membantu memfilter request, tetapi **bukan secret** karena kode PWA dapat dilihat pengguna. Untuk aplikasi internal dengan kebutuhan keamanan lebih tinggi, gunakan autentikasi Google/OAuth atau backend yang memiliki autentikasi server-side.
