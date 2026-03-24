<#
.SYNOPSIS
  WargaPOS post-install setup script.
  Runs as part of the NSIS installer (elevated).

.PARAMETER InstDir
  The installation directory chosen by the user (e.g. C:\WargaPOS).
#>
param(
    [Parameter(Mandatory)][string]$InstDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$PgBin    = Join-Path $InstDir 'postgres\bin'
$PgData   = Join-Path $InstDir 'postgres\data'
$PgLog    = Join-Path $InstDir 'postgres\data\postgres.log'
$ServerDir = Join-Path $InstDir 'server'
$ToolsDir  = Join-Path $InstDir 'tools'
$Nssm      = Join-Path $ToolsDir 'nssm.exe'
$Migrate   = Join-Path $ServerDir 'wargapos-migrate.exe'
$ConfigTmpl = Join-Path $ServerDir 'config.yaml.tmpl'
$ConfigOut  = Join-Path $ServerDir 'config.yaml'
$UploadDir  = Join-Path $ServerDir 'uploads'

function Log($msg) { Write-Host "[WargaPOS Setup] $msg" }

# ── 1. Create uploads directory ────────────────────────────────────────────────
Log "Creating uploads directory..."
New-Item -ItemType Directory -Force -Path $UploadDir | Out-Null

# ── 2. Generate random passwords/secrets ──────────────────────────────────────
Log "Generating secrets..."
$RngBytes   = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24)
$DbPassword = [System.Convert]::ToBase64String($RngBytes) -replace '[^A-Za-z0-9]', '' | Select-Object -First 1
$DbPassword = ($DbPassword + 'Aa1!')[0..15] -join ''   # ensure length=16, meets pg complexity

$RngBytes2  = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
$JwtSecret  = [System.Convert]::ToBase64String($RngBytes2)

# ── 3. Write config.yaml ───────────────────────────────────────────────────────
Log "Writing config.yaml..."
$UploadDirEscaped = $UploadDir -replace '\\', '\\'
$cfg = (Get-Content $ConfigTmpl -Raw)
$cfg = $cfg -replace '\{\{UPLOAD_DIR\}\}',  $UploadDirEscaped
$cfg = $cfg -replace '\{\{DB_PASSWORD\}\}', $DbPassword
$cfg = $cfg -replace '\{\{JWT_SECRET\}\}',  $JwtSecret
Set-Content -Path $ConfigOut -Value $cfg -Encoding UTF8

# ── 4. Initialize PostgreSQL data directory ───────────────────────────────────
Log "Initializing PostgreSQL data directory..."
$initdb = Join-Path $PgBin 'initdb.exe'
& $initdb -D $PgData -U postgres -E UTF8 --locale=C --auth=trust
if ($LASTEXITCODE -ne 0) { throw "initdb failed" }

# Allow only local connections in pg_hba.conf
$hba = Join-Path $PgData 'pg_hba.conf'
Set-Content $hba @"
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
"@ -Encoding UTF8

# ── 5. Start PostgreSQL temporarily to create DB + user ───────────────────────
Log "Starting PostgreSQL temporarily..."
$pgctl = Join-Path $PgBin 'pg_ctl.exe'
& $pgctl start -D $PgData -l $PgLog -w -t 60
if ($LASTEXITCODE -ne 0) { throw "pg_ctl start failed" }

Log "Creating database user and database..."
$psql = Join-Path $PgBin 'psql.exe'
& $psql -U postgres -c "CREATE ROLE wargapos LOGIN PASSWORD '$DbPassword';"
& $psql -U postgres -c "CREATE DATABASE wargapos OWNER wargapos;"
if ($LASTEXITCODE -ne 0) { throw "Failed to create database" }

Log "Stopping temporary PostgreSQL..."
& $pgctl stop -D $PgData -w -t 60
if ($LASTEXITCODE -ne 0) { throw "pg_ctl stop failed" }

# ── 6a. Add PostgreSQL bin to system PATH ─────────────────────────────────────
Log "Adding PostgreSQL bin to system PATH..."
$machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
if ($machinePath -notlike "*$PgBin*") {
    [System.Environment]::SetEnvironmentVariable('Path', "$PgBin;$machinePath", 'Machine')
}

# ── 6. Grant NetworkService access to the data directory ──────────────────────
Log "Granting NetworkService access to PostgreSQL data directory..."
$acl  = Get-Acl $PgData
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "NT AUTHORITY\NetworkService",
    "FullControl",
    "ContainerInherit,ObjectInherit",
    "None",
    "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl $PgData $acl

# ── 6b. Copy pg_dump.exe and psql.exe to server\bin\ ─────────────────────────
Log "Copying PostgreSQL client tools to server\bin..."
$ServerBin = Join-Path $ServerDir 'bin'
New-Item -ItemType Directory -Force -Path $ServerBin | Out-Null
Copy-Item (Join-Path $PgBin 'pg_dump.exe') $ServerBin
Copy-Item (Join-Path $PgBin 'psql.exe')    $ServerBin

# ── 7. Register PostgreSQL as a Windows service ────────────────────────────────
Log "Registering PostgreSQL Windows service..."
& $pgctl register -N "WargaPOS-DB" -U "NT AUTHORITY\NetworkService" -D $PgData -l $PgLog
if ($LASTEXITCODE -ne 0) { throw "pg_ctl register failed" }

Start-Service "WargaPOS-DB"
Start-Sleep -Seconds 3

# ── 8. Run database migrations ────────────────────────────────────────────────
Log "Running database migrations..."
$env:CONFIG_PATH = $ConfigOut
& $Migrate up
if ($LASTEXITCODE -ne 0) { throw "Migrations failed" }

# ── 9. Register WargaPOS server as Windows service via NSSM ──────────────────
Log "Registering WargaPOS server service..."
$ServerExe = Join-Path $ServerDir 'wargapos-server.exe'
& $Nssm install WargaPOS-Server $ServerExe
& $Nssm set WargaPOS-Server AppDirectory $ServerDir
$machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
& $Nssm set WargaPOS-Server AppEnvironmentExtra "CONFIG_PATH=$ConfigOut`nPATH=$machinePath"
& $Nssm set WargaPOS-Server DependOnService WargaPOS-DB
& $Nssm set WargaPOS-Server Start SERVICE_AUTO_START
& $Nssm set WargaPOS-Server DisplayName "WargaPOS Server"
& $Nssm set WargaPOS-Server Description "WargaPOS Point-of-Sale server"
& $Nssm start WargaPOS-Server

Log "Setup complete."
