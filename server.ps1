$ErrorActionPreference = 'Stop'
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

$OTA_PIN = 'atmi56jayajayajaya'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://+:8080/')
$listener.Start()

Write-Host "Server AKTIF di http://localhost:8080 dan http://10.30.137.52:8080"
Write-Host "Halaman OTA Deploy & Live Chat: http://10.30.137.52:8080/ota-deploy.html"

function Send-Json($ctx, $obj, $statusCode = 200) {
  $json = $obj | ConvertTo-Json -Depth 10
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $ctx.Response.StatusCode = $statusCode
  $ctx.Response.ContentType = 'application/json; charset=utf-8'
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $method = $ctx.Request.HttpMethod
    $path = $ctx.Request.Url.LocalPath.TrimStart('/')

    if ($method -eq 'POST' -and $path -eq 'api/ota-upload') {
      $pin = $ctx.Request.Headers['X-OTA-PIN']
      if ($pin -ne $OTA_PIN) {
        Send-Json $ctx @{ ok = $false; error = 'PIN salah atau tidak valid' } 401
        $ctx.Response.Close()
        continue
      }

      $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, [System.Text.Encoding]::UTF8)
      $body = $reader.ReadToEnd()
      $payload = $body | ConvertFrom-Json

      $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
      $backupDir = Join-Path $rootDir "_backup\$stamp"
      New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

      $updated = @()
      if ($payload.zipBase64) {
        $zipPath = Join-Path $backupDir 'package.zip'
        [System.IO.File]::WriteAllBytes($zipPath, [Convert]::FromBase64String($payload.zipBase64))
        Expand-Archive -Path $zipPath -DestinationPath $rootDir -Force
        $updated += 'package.zip (extracted)'
      } elseif ($payload.files) {
        foreach ($f in $payload.files) {
          $safeName = Split-Path $f.name -Leaf
          $targetPath = Join-Path $rootDir $safeName
          if (Test-Path $targetPath) {
            Copy-Item $targetPath (Join-Path $backupDir $safeName) -Force
          }
          [System.IO.File]::WriteAllText($targetPath, $f.content, [System.Text.Encoding]::UTF8)
          $updated += $safeName
        }
      }

      $newVer = Get-Date -Format 'yyyy.MM.dd.HHmmss'
      $verObj = @{ version = $newVer; updatedAt = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') }
      [System.IO.File]::WriteAllText((Join-Path $rootDir 'version.json'), ($verObj | ConvertTo-Json), [System.Text.Encoding]::UTF8)

      Send-Json $ctx @{ ok = $true; version = $newVer; updated = $updated } 200
      $ctx.Response.Close()
      continue
    }

    if ($method -eq 'GET' -and $path -eq 'api/live-code') {
      $allowed = @('index.html', 'app.js', 'style.css', 'server.ps1', 'ota-deploy.html', 'version.json', 'AGENTS.md', 'COLLAB_LOG.md')
      $fileParam = $ctx.Request.QueryString['file']
      if ([string]::IsNullOrEmpty($fileParam)) {
        $existing = $allowed | Where-Object { Test-Path (Join-Path $rootDir $_) }
        Send-Json $ctx $existing 200
      } elseif ($allowed -contains $fileParam -and (Test-Path (Join-Path $rootDir $fileParam))) {
        $codeText = [System.IO.File]::ReadAllText((Join-Path $rootDir $fileParam), [System.Text.Encoding]::UTF8)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($codeText)
        $ctx.Response.ContentType = 'text/plain; charset=utf-8'
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        Send-Json $ctx @{ error = 'File tidak ditemukan atau tidak diizinkan' } 404
      }
      $ctx.Response.Close()
      continue
    }

    if ($path -eq 'api/collab') {
      $collabFile = Join-Path $rootDir 'collab-history.json'
      if ($method -eq 'GET') {
        if (Test-Path $collabFile) {
          $raw = [System.IO.File]::ReadAllText($collabFile, [System.Text.Encoding]::UTF8)
          $bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
          $ctx.Response.ContentType = 'application/json; charset=utf-8'
          $ctx.Response.ContentLength64 = $bytes.Length
          $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
          Send-Json $ctx @() 200
        }
        $ctx.Response.Close()
        continue
      } elseif ($method -eq 'POST') {
        $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream, [System.Text.Encoding]::UTF8)
        $entry = $reader.ReadToEnd() | ConvertFrom-Json
        $list = @()
        if (Test-Path $collabFile) {
          $existing = [System.IO.File]::ReadAllText($collabFile, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
          if ($existing) { $list = @($existing) }
        }
        $list += @{
          timestamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
          author = $entry.author
          branch = $entry.branch
          message = $entry.message
        }
        [System.IO.File]::WriteAllText($collabFile, ($list | ConvertTo-Json -Depth 5), [System.Text.Encoding]::UTF8)
        Send-Json $ctx @{ ok = $true } 200
        $ctx.Response.Close()
        continue
      }
    }

    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
    $filePath = Join-Path $rootDir $path
    if (Test-Path $filePath -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $mime = switch ($ext) {
        '.html' { 'text/html; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.js'   { 'application/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.png'  { 'image/png' }
        '.jpg'  { 'image/jpeg' }
        default { 'application/octet-stream' }
      }
      $ctx.Response.ContentType = $mime
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch {
    try { $ctx.Response.Close() } catch {}
  }
}
