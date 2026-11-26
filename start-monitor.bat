@echo off
title Monitoring Stok Komponen TS - Server & OTA Auto-Update (Port 8080)
cd /d "%~dp0"
echo Menjalankan server di http://10.30.137.52:8080 ...
echo OTA Auto-Update aktif (cek GitHub setiap 60 detik).
start /b powershell -NoProfile -ExecutionPolicy Bypass -Command "while ($true) { Start-Sleep -Seconds 60; git pull origin main --quiet 2>$null }"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://+:8080/'); $listener.Start(); Write-Host 'Server AKTIF di http://localhost:8080 dan http://10.30.137.52:8080'; while ($listener.IsListening) { $ctx = $listener.GetContext(); $reqPath = $ctx.Request.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrEmpty($reqPath)) { $reqPath = 'index.html' }; $filePath = Join-Path (Get-Location) $reqPath; if (Test-Path $filePath -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($filePath); $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); $mime = switch ($ext) { '.html' {'text/html; charset=utf-8'} '.css' {'text/css; charset=utf-8'} '.js' {'application/javascript; charset=utf-8'} '.json' {'application/json; charset=utf-8'} '.png' {'image/png'} '.jpg' {'image/jpeg'} default {'application/octet-stream'} }; $ctx.Response.ContentType = $mime; $ctx.Response.ContentLength64 = $bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $ctx.Response.StatusCode = 404 }; $ctx.Response.Close() }"
pause
