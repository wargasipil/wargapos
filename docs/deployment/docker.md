# Docker

WargaPOS ships as a single Docker image (`kampretcode/wargapos`) that includes the compiled Go server with the React frontend statically embedded.

## Multi-stage Build

```
Dockerfile (3 stages)
  ├── Stage 1: node:24-alpine   — builds the React frontend
  ├── Stage 2: golang:1.25-alpine — compiles the Go binary (embeds frontend static files)
  └── Stage 3: alpine:3.21      — minimal runtime (adds postgresql-client for pg_dump/psql)
```

The frontend Vite build outputs to `backend/cmd/server/static/`. The Go binary embeds this via `//go:embed static`. The final image is about 30–40 MB.

Port exposed: **8080**

## Building

```bash
# Build and push to kampretcode/wargapos:latest
make docker-push

# Build and push a versioned tag
make docker-push TAG=1.2.0
```

The `docker-push.sh` script builds with `docker buildx` and pushes to Docker Hub.

## Running with Docker Compose

Minimal `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: wargapos
      POSTGRES_USER: wargapos
      POSTGRES_PASSWORD: changeme
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    image: kampretcode/wargapos:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://wargapos:changeme@db:5432/wargapos
      JWT_SECRET: change-me-in-production
    depends_on:
      - db
    volumes:
      - uploads:/app/uploads
      - backups:/app/backups

volumes:
  pgdata:
  uploads:
  backups:
```

## Running Migrations in Docker

```bash
# Run migrations via the embedded migrate command
docker run --rm \
  -e DATABASE_URL=postgres://wargapos:changeme@db:5432/wargapos \
  kampretcode/wargapos:latest \
  /app/server migrate up
```

Or run the dedicated migrate binary:

```bash
make migrate-up
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes (prod) | HMAC-SHA256 signing key |
| `MIDTRANS_SERVER_KEY` | no | Midtrans server key |
| `MIDTRANS_CLIENT_KEY` | no | Midtrans client key |

## Windows Installer

For Windows deployments (e.g. cafe with a local PC), a self-contained installer bundles WargaPOS + PostgreSQL:

```bash
make installer VERSION=1.0.0
```

The installer is built with `scripts/build-installer.ps1` and requires PowerShell.

## Printer Connector

The connector runs as a **separate process** on the local machine near the printer. It is not included in the Docker image.

```bash
# Build the connector release (creates a GitHub release)
make connector-release TAG=v1.0.0

# Or run directly during development
PRINTER_ADDRESS=192.168.1.100:9100 make connector-run
```

The connector binary connects back to the main server via a long-lived streaming RPC.
