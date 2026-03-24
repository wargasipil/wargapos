# Download third-party tools for WargaPOS development
# Run from repo root: .\scripts\download-tools.ps1

$ErrorActionPreference = "Stop"

$binDir = Join-Path $PSScriptRoot "..\thirdparties\bin"
$binDir = [System.IO.Path]::GetFullPath($binDir)

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
    Write-Host "Created $binDir"
}

# ESC/POS Virtual Printer Emulator
# https://github.com/Garletz/escpos-virtual-printer-emulator
$emulatorUrl  = "https://github.com/Garletz/escpos-virtual-printer-emulator/releases/download/windobe/escpos_emulator.exe"
$emulatorDest = Join-Path $binDir "escpos_emulator.exe"

if (Test-Path $emulatorDest) {
    Write-Host "escpos_emulator.exe already exists, skipping."
} else {
    Write-Host "Downloading escpos_emulator.exe ..."
    Invoke-WebRequest -Uri $emulatorUrl -OutFile $emulatorDest -UseBasicParsing
    Write-Host "Saved to $emulatorDest"
}

# PostgreSQL client tools (psql, pg_dump + DLLs) — extracted flat into $binDir
$PgVersion = '17.5-1'
$PgZip     = Join-Path $binDir "pgsql-$PgVersion.zip"

if (Test-Path (Join-Path $binDir 'pg_dump.exe')) {
    Write-Host "PostgreSQL bin tools already exist, skipping."
} else {
    if (!(Test-Path $PgZip)) {
        Write-Host "Downloading PostgreSQL $PgVersion portable..."
        $PgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64-binaries.zip"
        Invoke-WebRequest -Uri $PgUrl -OutFile $PgZip -UseBasicParsing
    }
    Write-Host "Extracting PostgreSQL bin/ into $binDir..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($PgZip)
    try {
        foreach ($entry in $zip.Entries) {
            # Only extract entries inside pgsql/bin/ (DLLs + executables, no subdirs)
            if ($entry.FullName -notlike 'pgsql/bin/*') { continue }
            $filename = [System.IO.Path]::GetFileName($entry.FullName)
            if ($filename -eq '') { continue }   # directory entry itself
            $dest = Join-Path $binDir $filename
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
        }
    } finally {
        $zip.Dispose()
    }
    Remove-Item $PgZip
    Write-Host "Extracted pg_dump.exe, psql.exe and DLLs to $binDir"
}

Write-Host "PostgreSQL tools: $binDir  (add to PATH for pg_dump / psql)"

Write-Host "Done. Tools are in thirdparties\bin\"
