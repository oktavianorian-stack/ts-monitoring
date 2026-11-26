# Dashboard Monitoring Stok Komponen TS

Dashboard web *real-time* untuk memantau stok komponen/sparepart TS (Habis, Kritis, Mendekati Minimum, dan Aman) yang terhubung secara *read-only* ke Google Sheet `TS103` (tab `LOC`) melalui Google Apps Script.

## Prasyarat
- Browser modern (Chrome / Edge / Firefox)
- Windows PC (untuk menjalankan `start-monitor.bat` tanpa perlu install Node.js/Python)
- Tidak ada dependencies eksternal yang perlu di-install (`npm install` tidak diperlukan; Bootstrap 5, Chart.js, dan Lucide dimuat via CDN)
- Tidak ada `.env` yang dibutuhkan (URL Web App Apps Script sudah dikonfigurasi di `app.js` dan dapat diubah lewat tombol **Sync Sheet** di UI)

## Cara Menjalankan Secara Lokal

### Opsi 1: Buka Langsung
Klik dua kali file `index.html` untuk membukanya langsung di browser.

### Opsi 2: Jalankan sebagai Web Server (Bisa Diakses dari HP / PC Lain)
1. Pastikan port `8080` sudah diizinkan di Windows Firewall (jalankan sekali di Command Prompt **Run as administrator**):
   ```cmd
   netsh advfirewall firewall add rule name="TS Monitor Port 8080" dir=in action=allow protocol=TCP localport=8080
   ```
2. Klik kanan **`start-monitor.bat`** $\rightarrow$ **Run as administrator**.
3. Buka di browser:
   - PC lokal: `http://localhost:8080`
   - Perangkat lain di jaringan yang sama: `http://<IP-PC-HOST>:8080`

## Alur Kerja Kolaborasi (Git)
1. Clone repository:
   ```bash
   git clone <URL-REPO-GITHUB-ANDA>
   cd "TS PROJECT"
   ```
2. Buat branch baru sebelum mulai ngoding:
   ```bash
   git checkout -b feat/nama-fitur
   ```
3. Setelah selesai, push branch dan buat **Pull Request** ke `main`:
   ```bash
   git add .
   git commit -m "feat: deskripsi singkat perubahan"
   git push -u origin feat/nama-fitur
   ```
