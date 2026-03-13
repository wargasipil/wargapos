# WargaPOS — Project Plan

## Completed: Skeleton
- Buf + Protocol Buffers (4 services, 20+ RPCs)
- Go backend with Connect Protocol stub handlers
- React 19 + Vite frontend with Connect-Web clients
- All code generated and compiling

## Completed: Config Layer + Goose Migrations

### Config Layer
- `backend/internal/config/config.go` — typed `Config` struct with YAML parsing
- `backend/config.yaml` — gitignored local config (edit credentials here)
- `backend/config.yaml.example` — committed example
- Falls back to dev defaults if `config.yaml` not found
- Config path overridable with `CONFIG_PATH` env var

### Migrations
- `backend/migrations/00001_init_schema.sql` — creates all 5 tables
- `backend/migrations/embed.go` — embeds SQL files via `go:embed`
- `backend/internal/db/migrate.go` — `RunMigrations(*sql.DB)` helper
- `backend/cmd/migrate/main.go` — standalone CLI: `up | down | status | reset`

### Tables
| Table | Key columns |
|---|---|
| users | id, username, email, password_hash, role, is_active |
| categories | id, name |
| products | id, name, sku, price_cents, category_id (FK), is_active |
| orders | id, cashier_id (FK), total_cents, status, payment_method |
| order_items | id, order_id (FK), product_id (FK), quantity, unit_price_cents |

---

## Directory Structure

```
wargapos/
├── .gitignore
├── Makefile
├── proto/
│   ├── buf.yaml
│   ├── buf.gen.yaml
│   └── wargapos/{auth,user,product,transaction}/v1/*.proto
├── backend/
│   ├── config.yaml          (gitignored)
│   ├── config.yaml.example
│   ├── go.mod
│   ├── migrations/
│   │   ├── embed.go
│   │   └── 00001_init_schema.sql
│   ├── cmd/
│   │   ├── server/main.go
│   │   └── migrate/main.go
│   ├── internal/
│   │   ├── config/config.go
│   │   ├── db/db.go + migrate.go
│   │   └── handler/{auth,user,product,transaction}.go
│   └── gen/  (buf-generated)
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/{main,App,client}.tsx + gen/
```

---

## Dev Commands

```bash
# Config (first time)
cp backend/config.yaml.example backend/config.yaml

# Migrations
make migrate-status   # show pending/applied
make migrate-up       # apply all pending
make migrate-down     # roll back last
make migrate-reset    # roll back all

# Backend
make backend-run      # starts on :8080 (reads backend/config.yaml)

# Frontend
make frontend-dev     # Vite on :5173, proxies /wargapos → :8080

# Proto codegen
make proto-gen        # regenerate after editing .proto files
```

---

## Next Steps (not yet planned)
- GORM model structs matching migration tables
- Real handler implementations (auth with JWT, CRUD)
- Authentication middleware
