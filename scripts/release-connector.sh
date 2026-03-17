#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"
if [ -z "$TAG" ]; then
  echo "Usage: $0 <tag>  (e.g. v1.0.0)"
  exit 1
fi

BINARY="wargapos-connector.exe"
DIST="dist/connector"
ARCHIVE="dist/wargapos-connector-${TAG}-windows-amd64.zip"

echo "==> Building $BINARY for Windows/amd64 ..."
mkdir -p "$DIST" dist
(
  cd backend
  GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" \
    -o "../$DIST/$BINARY" ./cmd/connector
)

echo "==> Copying config and startup files ..."
cp backend/cmd/connector/config.yaml.example "$DIST/config.yaml.example"
cp backend/cmd/connector/start.bat           "$DIST/start.bat"
cp backend/cmd/connector/start.ps1           "$DIST/start.ps1"

echo "==> Creating archive $ARCHIVE ..."
DIST_WIN="$(cygpath -w "$(pwd)/$DIST")"
ARCHIVE_WIN="$(cygpath -w "$(pwd)/$ARCHIVE")"
powershell.exe -NoProfile -Command "Compress-Archive -Path '${DIST_WIN}\\*' -DestinationPath '${ARCHIVE_WIN}' -Force"

echo "==> Creating GitHub release $TAG ..."
gh release create "$TAG" \
  "$ARCHIVE" \
  --title "WargaPOS Connector $TAG" \
  --notes "## WargaPOS Connector $TAG

Windows connector that bridges WargaPOS to ESC/POS printers via the Windows print spooler.

### Quick Start
1. Extract the zip
2. Copy \`config.yaml.example\` → \`config.yaml\` and edit if needed
3. Run \`start.bat\` or \`start.ps1\`

> A \`connector-identity.json\` file is created automatically on first run — do not delete it.

### Config
| Field | Default | Env var |
|-------|---------|---------|
| \`printer.host\` | \`localhost\` | \`CONNECTOR_HOST\` |
| \`printer.port\` | \`8081\` | \`CONNECTOR_PORT\` |
| \`printer.server_url\` | \`https://wargapos-production.up.railway.app\` | \`CONNECTOR_SERVER_URL\` |

Printer selection uses the Windows print spooler — no IP address needed."

echo "==> Done: $ARCHIVE released as $TAG"
