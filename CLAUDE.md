# WargaPOS

POS app for cafes and marketplace management (monorepo). Backend: Go + ConnectRPC. Frontend: React 19 + Vite + Chakra UI v3.

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
- `backend/cmd/connector/` — local printer connector, Wire DI, identity management
- `backend/cmd/migrate/` — standalone migration CLI (up | down | status | reset)
- `backend/migrations/` — Goose SQL migration files + embed.go

## Services
| Domain | Package | Proto |
|--------|---------|-------|
| Auth | `auth_service` | `wargapos.auth.v1` |
| User | `user_service` | `wargapos.user.v1` |
| Product | `product_service` | `wargapos.product.v1` |
| Transaction | `transaction_service` | `wargapos.transaction.v1` |
| Table | `table_service` | `wargapos.table.v1` |
| Connector | `connector_service` | `wargapos.connector.v1` |
| Stock | `stock_service` | `wargapos.stock.v1` |
| Ingredient | `ingredient_service` | `wargapos.ingredient.v1` |
| Marketplace | `marketplace_service` | `wargapos.marketplace.v1` |

## Dev Commands
- `make backend-run` — start Go server on :8080
- `make frontend-dev` — start Vite on :5173 (proxies `/wargapos` → :8080)
- `make connector-run` — start local printer connector on :8081 (set `PRINTER_ADDRESS=ip:9100`)
- `make proto-gen` — regenerate after editing .proto files
- `wire gen ./backend/cmd/server` — regenerate Wire DI after changing providers
- `wire gen ./backend/cmd/connector` — regenerate Wire DI for connector
- `make migrate-up` — apply all pending migrations
- `make migrate-down` — roll back last migration
- `make migrate-status` — show pending/applied migrations
- `make migrate-reset` — roll back all migrations

## Database Tables
| Table | Key columns |
|-------|-------------|
| users | id, username, email, password_hash, role, is_active |
| categories | id, name |
| products | id, name, sku, price_cents, category_id (FK), is_active |
| orders | id, cashier_id (FK), table_id, total_cents, status, payment_method |
| order_items | id, order_id (FK), product_id (FK), quantity, unit_price_cents |
| warehouses | id, name, deleted |
| skus | id, code, product_id, warehouse_id, stock_qty, costing_type |
| stock_transactions | id, transaction_type, cancelled |
| stock_logs | id, sku_id, transaction_id, change, log_type, cost_version_id |
| cost_versions | id, sku_id, transaction_id, unit_cost, stock_initiate, left_stock |
| marketplace_shops | id, name, type, username, url, is_active |
| marketplace_products | id, name, description, price_cents, image_url, is_active |
| marketplace_product_stocks | id, marketplace_product_id, warehouse_id, sku_id, left_stock |
| marketplace_customers | id, name, phone_number |
| marketplace_orders | id, shop_id, customer_id, warehouse_id, customer_name, phone_number, total_cents, status |
| marketplace_order_items | id, order_id, item_name, quantity, unit_price_cents, subtotal_cents |

## Design Principles
- **Desktop-first**: optimized for desktop; mobile is secondary
- Use Chakra UI v3 components first for all UI — before any custom HTML or third-party libs
- Pricing in IDR (BigInt cents, stored as int64)
- Connect RPC errors: strip `[code] ` prefix before showing to user

## Shared Frontend Components (`frontend/src/components/shared/`)
Reusable searchable entity selectors — all use Popover + Input + scrollable list (Chakra UI only):

| Component | Props | Notes |
|-----------|-------|-------|
| `SkuSelect` | `value`, `onChange`, `placeholder?`, `size?`, `w?`, `minW?` | Searches by SKU code; `value=0` means none |
| `WarehouseSelect` | `value`, `onChange`, `withAll?`, `placeholder?`, `size?`, `w?` | `withAll` shows "All warehouses" option |
| `RackSelect` | `value`, `onChange`, `warehouseId?`, `excludeRackId?`, `placeholder?`, `size?`, `w?` | Filters by warehouse; excludes self when moving |
| `CustomerSelect` | `value: bigint`, `onChange: (id, name, phone) => void`, `placeholder?`, `w?` | Server-side search via `listCustomers`; `value=0n` means none |
| `ShopSelect` | `value: bigint`, `onChange: (id) => void`, `placeholder?`, `w?` | Client-side search; loads all active shops once |

Usage example:
```tsx
<SkuSelect value={skuId} onChange={setSkuId} placeholder="All SKUs" minW="180px" />
<WarehouseSelect value={warehouseId} onChange={setWarehouseId} withAll w="180px" />
<RackSelect value={rackId} onChange={setRackId} warehouseId={warehouseId} w="180px" />
<CustomerSelect value={customerId} onChange={(id, name, phone) => { setCustomerId(id); setCustomerName(name); setPhoneNumber(phone) }} w="100%" />
<ShopSelect value={shopId} onChange={setShopId} w="180px" />
```

## Marketplace Module
- Shops: CRUD for marketplace storefronts (Shopee, Tokopedia, Lazada, Other)
- Products: catalog with per-warehouse stock tracking; restock via stock SKU system (`MP-{productId}-{warehouseId}`)
- Customers: standalone customer records (name, phone) linked to orders via `customer_id` FK
- Orders: created with shop + warehouse + customer; line items are free-text (not linked to marketplace products)
- Auth: most marketplace RPCs require `admin` or `manager`; `ListShops` is public

## Stock Module
- Warehouses → SKUs (per product+warehouse) → stock transactions (STOCK_IN / STOCK_OUT / provision)
- Cost versioning: FIFO/LIFO tracking via `cost_versions` table; `cost_version_id` on every `stock_log`
- `stock_core` package: `SkuStockAdd`, `SkuStockProvision`, `SkuStockCancel` — core stock mutation functions
- Ingredient service uses stock SKUs for material tracking; marketplace restock also uses stock SKUs

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

## Connector
- Local bridge service between browser and ESC/POS printer hardware
- Runs separately on :8081 (not part of the main server on :8080)
- Persistent device identity stored in `identity.json` (UUID + hostname)
- Registers itself with main server via long-lived device stream (exponential backoff reconnection)
- Exposes two local Connect RPC endpoints: `Print` (raw ESC/POS bytes) and `GetStatus` (printer address + connection state)
- Uses h2c (HTTP/2 cleartext) + permissive CORS for browser access
