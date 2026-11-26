# AGENTS.md — Panduan Kolaborasi & Arsitektur Project

## 1. Arsitektur & Tech Stack
- **Tujuan**: Dashboard monitoring stok komponen/sparepart TS (PT Akasha Wira International Tbk) dengan integrasi *read-only* ke Google Sheet `TS103` (tab `LOC`).
- **Tech Stack**:
  - **Frontend**: HTML5, CSS3 (Bootstrap 5.3 + Liquid Glass UI), Vanilla JavaScript (ES6+)
  - **Visualisasi**: Chart.js (Bar Chart per Tab & Donut Chart), Lucide Icons
  - **Data Source**: Google Apps Script Web App (`doGet` JSON, 100% *read-only*)
  - **Local Hosting**: `start-monitor.bat` (PowerShell `HttpListener` di port `8080`)

## 2. Struktur Folder
```text
TS PROJECT/
├── index.html          # Struktur utama halaman & modal
├── style.css           # Tema Akasha Wira + Liquid Glass UI
├── app.js              # Logika fetch Apps Script, Chart.js, filter, & jadwal sync
├── akasha-logo.png     # Logo resmi Akasha International
├── start-monitor.bat   # Script untuk menjalankan web server lokal (port 8080)
├── AGENTS.md           # Aturan kolaborasi developer & AI
├── README.md           # Panduan setup & menjalankan project
└── .gitignore          # Daftar file yang diabaikan Git
```

## 3. Coding Style & Konvensi Penamaan
- Gunakan **2 spasi** untuk indentasi di HTML, CSS, dan JS.
- Penamaan variabel & fungsi JavaScript menggunakan `camelCase` (contoh: `syncFromAppsScript`, `toggleMonitoringMode`).
- Penamaan class CSS custom menggunakan `kebab-case` (contoh: `akasha-navbar`, `btn-akasha-gold`).
- **Keamanan Data**: Jangan pernah menambahkan fungsi tulis/ubah/hapus ke Google Apps Script (`doPost` atau `setValues`) tanpa persetujuan eksplisit. Integrasi ke sheet `TS103` wajib tetap *read-only*.

## 4. Aturan Git Workflow
- **Dilarang commit langsung ke branch `main`.**
- Setiap fitur, perbaikan bug, atau perubahan UI wajib dikerjakan di branch terpisah dengan format:
  - `feat/<nama-fitur>` (contoh: `feat/export-pdf`)
  - `fix/<nama-bug>` (contoh: `fix/chart-overflow`)
  - `chore/<tugas>` (contoh: `chore/update-docs`)
- Penggabungan ke `main` wajib melalui **Pull Request (PR)** dan direview oleh rekan tim sebelum di-merge.
