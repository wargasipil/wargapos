# WargaPOS

WargaPOS is a Point-of-Sale system for cafes with integrated marketplace management. It runs as a monorepo containing a Go backend and a React frontend.

## Key Features

- **Cafe POS** — order taking, cart management, kitchen display, table management
- **Payment** — cash and online payment via Midtrans Snap
- **Stock Management** — warehouses, SKUs, rack placements, FIFO/LIFO cost versioning
- **Ingredient Tracking** — materials and recipes linked to products
- **Marketplace** — manage Shopee, Tokopedia, Lazada storefronts, orders, and customers
- **Printer Connector** — local bridge service for ESC/POS receipt printing
- **Role-Based Access** — Root, Admin, Warehouse Admin, Accountant, Cashier roles
- **Backup & Restore** — PostgreSQL dump/restore via the admin panel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go, Connect Protocol (connectrpc.com/connect), GORM, PostgreSQL |
| Frontend | React 19, TanStack Router, TanStack Query, Chakra UI v3, Zustand |
| API | Protocol Buffers (Buf), Connect Protocol |
| DI | Google Wire |
| Payment | Midtrans Snap |
| Migrations | Goose |

## Services

| Service | Proto Package | Description |
|---------|--------------|-------------|
| Auth | `wargapos.auth.v1` | Login, token refresh |
| User | `wargapos.user.v1` | User CRUD |
| Product | `wargapos.product.v1` | Cafe products & categories |
| Transaction | `wargapos.transaction.v1` | Cart, checkout, orders |
| Table | `wargapos.table.v1` | Dining tables |
| Stock | `wargapos.stock.v1` | Warehouses, SKUs, transactions |
| Ingredient | `wargapos.ingredient.v1` | Materials & recipes |
| Marketplace | `wargapos.marketplace.v1` | Shops & marketplace products |
| Marketplace Order | `wargapos.marketplace_order.v1` | Orders, customers, addresses |
| Settings | `wargapos.settings.v1` | System configuration |
| Device | `wargapos.device.v1` | Printer device management |
| Notification | `wargapos.notification.v1` | In-app notifications |
| Backup | `wargapos.backup.v1` | Database backup & restore |
