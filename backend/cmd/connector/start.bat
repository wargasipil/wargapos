@echo off
:: WargaPOS Connector - Windows Startup Script
:: Edit config.yaml before running, or set environment variables below.

:: Uncomment and edit these if not using config.yaml:
:: set CONNECTOR_HOST=localhost
:: set CONNECTOR_PORT=8081
:: set CONNECTOR_SERVER_URL=https://wargapos-production.up.railway.app

echo Starting WargaPOS Connector...
echo A connector-identity.json file will be created automatically on first run.
echo This file stores your device identity -- do not delete it.
echo.

wargapos-connector.exe
pause
