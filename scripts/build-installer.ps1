<#
.SYNOPSIS
  Builds the WargaPOS Windows all-in-one installer.

.DESCRIPTION
  1. Builds wargapos-server.exe and wargapos-migrate.exe for Windows/amd64
  2. Downloads PostgreSQL 16 portable binaries (cached)
  3. Downloads NSSM 2.24 (cached)
  4. Runs makensis to produce dist\wargapos-setup-<VERSION>.exe

.PARAMETER Version
  Installer version string, e.g. "1.0.0"

.EXAMPLE
  .\scripts\build-installer.ps1 -Version 1.0.0
#>
param(
    [string]$Version = "1.0.0"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root    = Split-Path $PSScriptRoot -Parent
$Build   = Join-Path $Root 'build'
$Cache   = Join-Path $Build 'cache'
$Dist    = Join-Path $Root 'dist'
$Backend = Join-Path $Root 'backend'

function Log($msg) { Write-Host "[build-installer] $msg" -ForegroundColor Cyan }
function Die($msg) { Write-Error "[build-installer] $msg"; exit 1 }

# ── Ensure directories exist ────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $Build, $Cache, $Dist | Out-Null

# ── 1. Build frontend into backend/cmd/server/static ────────────────────────
Log "Building frontend..."
Push-Location (Join-Path $Root 'frontend')
npm run build
if ($LASTEXITCODE -ne 0) { Die "Frontend build failed" }
Pop-Location

# ── 2. Build Go binaries (Windows/amd64) ────────────────────────────────────
Log "Building server binary..."
$env:GOOS   = 'windows'
$env:GOARCH = 'amd64'
$env:CGO_ENABLED = '0'

Push-Location $Backend
go build -ldflags "-s -w -X main.Version=$Version" `
    -o (Join-Path $Build 'wargapos-server.exe') `
    ./cmd/server
if ($LASTEXITCODE -ne 0) { Die "Server build failed" }

Log "Building migrate binary..."
go build -ldflags "-s -w" `
    -o (Join-Path $Build 'wargapos-migrate.exe') `
    ./cmd/migrate
if ($LASTEXITCODE -ne 0) { Die "Migrate build failed" }
Pop-Location

Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue

# ── 3. Download PostgreSQL portable (cached) ────────────────────────────────
$PgVersion = '16.8-1'
$PgZip     = Join-Path $Cache 'pgsql.zip'
$PgDir     = Join-Path $Build 'pgsql'

if (!(Test-Path $PgZip)) {
    Log "Downloading PostgreSQL $PgVersion portable..."
    $PgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PgVersion-windows-x64-binaries.zip"
    Invoke-WebRequest $PgUrl -OutFile $PgZip -UseBasicParsing
}

if (!(Test-Path $PgDir)) {
    Log "Extracting PostgreSQL..."
    Expand-Archive $PgZip $Build -Force
    # EnterpriseDB zip contains a single top-level 'pgsql' folder
}

# ── 4. Download NSSM (cached) ───────────────────────────────────────────────
$NssmZip = Join-Path $Cache 'nssm.zip'
$NssmExe = Join-Path $Build 'nssm.exe'

if (!(Test-Path $NssmExe)) {
    if (!(Test-Path $NssmZip)) {
        Log "Downloading NSSM..."
        Invoke-WebRequest 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $NssmZip -UseBasicParsing
    }
    Log "Extracting NSSM..."
    $NssmTmp = Join-Path $Build 'nssm-tmp'
    Expand-Archive $NssmZip $NssmTmp -Force
    Copy-Item (Join-Path $NssmTmp 'nssm-2.24\win64\nssm.exe') $NssmExe
    Remove-Item $NssmTmp -Recurse -Force
}

# ── 5. Run NSIS ─────────────────────────────────────────────────────────────
Log "Running makensis..."
$Nsis = Join-Path $Root 'installer\installer.nsi'
makensis /DVERSION=$Version /DBUILD_DIR=$Build $Nsis
if ($LASTEXITCODE -ne 0) { Die "makensis failed" }

$Output = Join-Path $Dist "wargapos-setup-$Version.exe"
Log "Installer created: $Output"
