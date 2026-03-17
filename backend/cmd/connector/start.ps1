# WargaPOS Connector - PowerShell Startup Script
# Edit config.yaml before running, or uncomment env overrides below.

# $env:CONNECTOR_HOST       = "localhost"
# $env:CONNECTOR_PORT       = "8081"
# $env:CONNECTOR_SERVER_URL = "https://wargapos-production.up.railway.app"

Write-Host "Starting WargaPOS Connector..."
Write-Host "Note: connector-identity.json will be created automatically on first run."
Write-Host "      This file stores your device identity -- do not delete it."
Write-Host ""

.\wargapos-connector.exe
