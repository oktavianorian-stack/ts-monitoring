# AGENTS.md — Panduan Kolaborasi & Arsitektur Project

## 1. Arsitektur & Tech Stack
- **Tujuan**: Dashboard monitoring stok komponen/sparepart TS, PR/PO, dan PM (PT Akasha Wira International Tbk) dengan integrasi *read-only* ke Google Sheet `TS103` (tab `LOC`) & `MONITORING PR`.
- **Tech Stack**:
  - **Frontend**: HTML5, CSS3 (Bootstrap 5.3 + Neon Akasha Liquid Glass UI), Vanilla JavaScript (ES6+)
  - **Visualisasi**: Chart.js (Bar Chart per Tab & Donut Chart), Lucide Icons
  - **Data Source**: Google Apps Script Web App (`doGet` JSON, 100% *read-only*)
  - **Local Hosting & OTA**: `server.ps1` / `server.py` (port `8080`) dengan `start-monitor.bat` (auto-restart) & `start-background.vbs` (silent background run)

## 2. Struktur Folder
```text
TS PROJECT/
├── index.html          # Dashboard Monitoring Stok Komponen TS (Dual-Chart Mode Monitoring + Jam Live)
├── pr-monitoring.html  # Dashboard Monitoring PR & PO (Mode Monitoring 2 Tabel: Kiri PR, Kanan PO + Auto Scroll + Sort Terbaru/Terlama)
├── pm-monitoring.html  # Dashboard Monitoring Preventive Maintenance (PM)
├── ota-deploy.html     # Halaman OTA Deploy via IP Lokal (PIN protected), Live Chat Kolaborasi, & Live Code Viewer (Read-Only)
├── style.css           # Tema Neon Akasha Wira + Liquid Glass UI + Fullscreen Lock (100vh)
├── app.js              # Logika fetch Apps Script (jadwal 07:00, 12:00, 16:00, 23:00), Chart.js, fuzzy search, inline min, & OTA auto-reload
├── akasha-logo.png     # Logo resmi Akasha International
├── server.ps1          # Web server + API /api/ota-upload, /api/collab, /api/live-code
├── start-monitor.bat   # Launcher server dengan auto-restart loop
├── start-background.vbs# Launcher server silent di background (one-time run)
├── version.json        # Versi aktif untuk trigger OTA auto-reload di browser
├── AGENTS.md           # Aturan kolaborasi developer & AI
├── COLLAB_LOG.md       # Catatan koordinasi perubahan antar developer/AGY
├── README.md           # Panduan setup & menjalankan project
└── .gitignore          # Daftar file yang diabaikan Git
```

## 3. Coding Style & Konvensi Penamaan
- Gunakan **2 spasi** untuk indentasi di HTML, CSS, dan JS.
- Penamaan variabel & fungsi JavaScript menggunakan `camelCase` (contoh: `syncFromAppsScript`, `toggleMonitoringMode`, `togglePrMonitoringMode`).
- Penamaan class CSS custom menggunakan `kebab-case` (contoh: `akasha-navbar`, `btn-akasha-gold`).
- **Keamanan Data**: Jangan pernah menambahkan fungsi tulis/ubah/hapus ke Google Apps Script (`doPost` atau `setValues`) tanpa persetujuan eksplisit. Integrasi ke sheet wajib tetap *read-only*.

## 4. Aturan Git Workflow & OTA
- **Dilarang commit langsung ke branch `main`.**
- Setiap fitur, perbaikan bug, atau perubahan UI wajib dikerjakan di branch terpisah (`feat/...`, `fix/...`, `chore/...`) dan digabung lewat **Pull Request (PR)**.
- Untuk deploy cepat ke PC Host di jaringan lokal, gunakan `POST /api/ota-upload` (atau `ota-deploy.html`) dengan PIN OTA yang berlaku, dan catat perubahan penting di `COLLAB_LOG.md` atau Live Chat.
