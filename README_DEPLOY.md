# Processing AWB — PWA + Google Sheets

## Struktur folder

- `index.html` — seluruh UI, CSS, dan JavaScript aplikasi.
- `manifest.json` — konfigurasi PWA.
- `sw.js` — cache/offline app shell.
- `logo-awb.png` — logo Agri Wangi Berry.
- `icon-192.png` — ikon PWA 192 px.
- `icon-512.png` — ikon PWA 512 px.
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

Tidak ada lagi URL yang perlu diedit di `index.html`. Setelah aplikasi diakses dari Vercel:

1. Buka aplikasi → tekan tombol **☁️ Connect Sheets** di header.
2. Tempel URL `/exec` dari Apps Script.
3. Pastikan `API_KEY` di `Code.gs` sama dengan `SYNC_CONFIG.API_KEY` di `index.html` (`AWB_PROCESSING_2026`).

URL disimpan di `localStorage` perangkat, jadi tiap device cukup dikonfigurasi sekali.

## 3. Upload ke GitHub

Upload seluruh isi folder ini ke root repository GitHub, sehingga `index.html` berada di root.

Contoh:

```text
repo/
├─ index.html
├─ manifest.json
├─ sw.js
├─ vercel.json
├─ logo-awb.png
├─ icon-192.png
├─ icon-512.png
└─ google-apps-script/
   └─ Code.gs
