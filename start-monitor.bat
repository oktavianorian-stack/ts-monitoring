@echo off
title Monitoring Stok Komponen TS - Server & OTA (Port 8080)
cd /d "%~dp0"
echo Menjalankan server + OTA API + Live Chat di http://10.30.137.52:8080 ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
