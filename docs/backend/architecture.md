# Architecture

## Monorepo Layout

```
wargapos/
├── proto/                        # Protocol Buffer definitions
│   └── wargapos/
│       ├── auth/v1/
│       ├── marketplace/v1/
│       ├── marketplace_order/v1/
│       └── ...
├── backend/
│   ├── cmd/
│   │   ├── server/               # Main server binary (Wire DI entrypoint)
│   │   ├── connector/            # Printer connector binary
│   │   └── migrate/              # Migration CLI
│   ├── gen/                      # Buf-generated Go code (do not edit)
│   ├── internal/
│   │   ├── auth/                 # JWT + role interceptors
│   │   ├── config/               # Config loading
│   │   ├── database/             # GORM connection
│   │   ├── models/               # GORM models
│   │   └── service/              # Domain service implementations
│   ├── migrations/               # Goose SQL migration files
│   └── pkgs/                     # Shared utilities (runner, wargatest)
├── frontend/
│   ├── src/
│   │   ├── gen/                  # Buf-generated TypeScript (do not edit)
│   │   ├── routes/               # Page components (TanStack Router)
│   │   ├── components/           # Shared UI components
│   │   ├── store/                # Zustand stores
│   │   ├── lib/                  # Utilities
│   │   ├── client.ts             # Typed Connect clients
│   │   └── router.tsx            # Route definitions
│   └── ...
└── docs/                         # This documentation
```

## Request Flow

```
Browser / Client
      │
      ▼
HTTP/2 (h2c or TLS)
      │
      ▼
Connect Protocol Handler  (mux.Handle)
      │
      ├── Auth Token Interceptor  → validates JWT, stores claims in context
      ├── Role Interceptor        → checks request_policy on proto message
      └── Validate Interceptor    → runs buf validate rules
      │
      ▼
Service Handler  (e.g. MarketplaceService.CreateShop)
      │
      ▼
GORM → PostgreSQL
```

## Dependency Injection (Wire)

WargaPOS uses [Google Wire](https://github.com/google/wire) for compile-time dependency injection.

- **`backend/cmd/server/wire.go`** — declares providers (build tags: `wireinject`)
- **`backend/cmd/server/wire_gen.go`** — generated wiring code (do not edit by hand)

After adding a new service or changing constructor signatures, regenerate with:

```bash
cd backend && wire gen ./cmd/server
```

## Connect Protocol

All RPCs use the [Connect Protocol](https://connectrpc.com) — a superset of gRPC that works over plain HTTP/1.1 and HTTP/2. The backend registers handlers via `connectrpc.com/connect`.

- Proto definitions live in `proto/wargapos/`
- Generated Go code: `backend/gen/`
- Generated TypeScript code: `frontend/src/gen/`

After editing `.proto` files, regenerate with:

```bash
make proto-gen
```

## Service Packages

Each domain service lives in `backend/internal/service/<name>_service/` and implements its Connect RPC interface directly. Each RPC method has its own file (e.g. `create_shop.go`).

| Package | Implements |
|---------|-----------|
| `auth_service` | `AuthServiceHandler` |
| `user_service` | `UserServiceHandler` |
| `product_service` | `ProductServiceHandler` |
| `transaction_service` | `TransactionServiceHandler` |
| `table_service` | `TableServiceHandler` |
| `stock_service` | `StockServiceHandler` |
| `ingredient_service` | `IngredientServiceHandler` |
| `marketplace_service` | `MarketplaceServiceHandler` |
| `marketplace_order_service` | `MarketplaceOrderServiceHandler` |
| `settings_service` | `SettingsServiceHandler` |
| `device_service` | `DeviceServiceHandler` |
| `notification_service` | `NotificationServiceHandler` |
| `backup_service` | `BackupServiceHandler` |

## Special HTTP Endpoints

In addition to Connect RPCs, the server exposes plain HTTP endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/midtrans/webhook` | Midtrans payment webhook |
| `GET` | `/setup-needed` | Returns `{"needed": true/false}` |
| `POST` | `/setup` | First-run user creation |
| `POST` | `/upload` | File upload (auth required) |
| `GET` | `/uploads/*` | Serve uploaded files |
| `GET` | `/backup/download-existing` | Download backup file |
| `POST` | `/backup/restore-upload` | Restore from uploaded dump |

## Printer Connector

The connector is a **separate binary** (`backend/cmd/connector`) that runs on the local machine alongside a physical ESC/POS printer.

- Listens on `:8081` (h2c, HTTP/2 cleartext)
- Registers itself with the main server via a long-lived streaming RPC
- Exposes `Print` and `GetStatus` Connect endpoints for the browser
- Uses permissive CORS for direct browser access
