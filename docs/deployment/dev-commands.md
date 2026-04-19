# Dev Commands

All commands run from the repo root unless noted.

## Setup

```bash
make setup          # Install all dependencies (go mod tidy + npm install)
make download-tools # Download third-party dev tools into thirdparties/bin/
```

## Backend

```bash
make backend-run    # Start Go server on :8080
make backend-build  # Compile binary to backend/bin/server
make backend-tidy   # Run go mod tidy
make backend-test   # Run Go tests
```

The server reads `backend/config.yaml`. Set `DB_SKIP=1` to skip the database connection (useful for UI-only dev):

```bash
DB_SKIP=1 make backend-run
```

## Frontend

```bash
make frontend-dev     # Start Vite dev server on :5173 (proxies /wargapos → :8080)
make frontend-build   # Production build → backend/cmd/server/static/
make frontend-install # Install npm dependencies
```

## Proto / Code Generation

```bash
make proto-gen    # Regenerate Go + TypeScript from .proto files
make proto-lint   # Lint proto files
make proto-format # Format proto files in place
```

After editing `.proto` files, always run `make proto-gen`. Do not edit files in `backend/gen/` or `frontend/src/gen/` directly.

## Wire (Dependency Injection)

```bash
cd backend && wire gen ./cmd/server     # Regenerate server DI
cd backend && wire gen ./cmd/connector  # Regenerate connector DI
```

Run after adding or changing service constructors.

## Database Migrations

```bash
make migrate-up     # Apply all pending migrations
make migrate-down   # Roll back the last migration
make migrate-status # Show applied/pending migrations
make migrate-reset  # Roll back ALL migrations (destructive!)
```

Migration files live in `backend/migrations/` named `00NNN_description.sql`.

## Connector

```bash
PRINTER_ADDRESS=192.168.1.100:9100 make connector-run
```

Starts the printer connector on `:8081`. The connector registers with the main server via a streaming RPC and forwards print jobs to the ESC/POS printer.

## Build & Release

```bash
make build                    # Build frontend then compile Go binary
make docker-push              # Build and push Docker image (latest)
make docker-push TAG=1.2.0    # Build and push versioned Docker image
make connector-release TAG=v1.0.0  # Build connector and create GitHub release
make installer VERSION=1.0.0  # Build Windows all-in-one installer
```

## Quick Reference

| Task | Command |
|------|---------|
| Start everything (dev) | `make backend-run` + `make frontend-dev` |
| Rebuild after proto changes | `make proto-gen` |
| Rebuild after DI changes | `cd backend && wire gen ./cmd/server` |
| Apply new migrations | `make migrate-up` |
| Run tests | `make backend-test` |
| Produce production binary | `make build` |
