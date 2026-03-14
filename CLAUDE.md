# WargaPOS

POS app for cafes (monorepo). Backend: Go + ConnectRPC. Frontend: React 19 + Vite + Chakra UI v3.

## Stack
- Backend: Go (`wargapos/backend` module), Connect Protocol (connectrpc.com/connect), GORM + PostgreSQL, Google Wire DI
- Frontend: React 19, TanStack Router + React Query, Chakra UI v3, Zustand
- API: Buf + Protocol Buffers, Connect Protocol (not plain gRPC)
- Payment: Midtrans Snap (`github.com/midtrans/midtrans-go`)

## Key Paths
- `proto/` — .proto files + buf.yaml + buf.gen.yaml
- `backend/gen/` — buf-generated Go code (do not edit)
- `frontend/src/gen/` — buf-generated TS code (do not edit)
- `backend/internal/service/` — domain services (implement Connect RPC interfaces directly)
- `backend/cmd/server/` — server entrypoint, Wire DI, Midtrans webhook handler

## Services
| Domain | Package | Proto |
|--------|---------|-------|
| Auth | `auth_service` | `wargapos.auth.v1` |
| User | `user_service` | `wargapos.user.v1` |
| Product | `product_service` | `wargapos.product.v1` |
| Transaction | `transaction_service` | `wargapos.transaction.v1` |
| Table | `table_service` | `wargapos.table.v1` |

## Dev Commands
- `make backend-run` — start Go server on :8080
- `make frontend-dev` — start Vite on :5173 (proxies `/wargapos` → :8080)
- `make proto-gen` — regenerate after editing .proto files
- `wire gen ./backend/cmd/server` — regenerate Wire DI after changing providers

## Design Principles
- **Mobile-first**: primary target is mobile/tablet (POS use case)
- Bottom nav bar on mobile, left sidebar on desktop (`md+` breakpoint)
- Card-based lists on mobile, tables on desktop
- Pricing in IDR (BigInt cents, stored as int64)
- Connect RPC errors: strip `[code] ` prefix before showing to user

## Guest Ordering
- Public route `/menu?table=<table_uuid>` — no auth required
- Guest browses menu, adds to cart (local state), submits order
- Payment: cash (pay at counter) or online (Midtrans Snap)
- Table ID (UUID) stored on order for staff tracking

## Midtrans
- Webhook: `POST /midtrans/webhook` (plain HTTP, not Connect RPC)
- Snap.js loaded in `frontend/index.html`
- Config: `config.yaml` → `midtrans.server_key / client_key / environment`
- Env vars: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`
