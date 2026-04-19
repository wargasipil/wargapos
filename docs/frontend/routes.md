# Frontend Routes

Built with [TanStack Router](https://tanstack.com/router). Route guards (`beforeLoad`) redirect unauthorized users to `/` or `/login`.

## Public Routes (no auth required)

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `LoginPage` | Login form. Redirects to `/setup` if no root user exists yet. |
| `/setup` | `SetupPage` | First-run root user creation. Redirects to `/login` if already set up. |
| `/menu` | `MenuPage` | Guest self-ordering menu (accessed via QR code: `/menu?table=<uuid>`). Supports cart + Midtrans payment. |
| `/print` | `PrintPage` | ESC/POS receipt print view. Opened in a new window by the POS page. |
| `/playground` | `PlaygroundPage` | Dev component playground (not linked in nav). |

---

## Protected Routes (JWT required)

All protected routes redirect to `/login` if no token is present.

### Core

| Path | Auth | Description |
|------|------|-------------|
| `/` | authenticated | Dashboard — revenue stats, order counts, top products |
| `/settings` | authenticated | App settings: Midtrans, manual payment, printer, backup, business type |
| `/users` | root, admin | User management — list, invite, edit, deactivate |

---

### Cafe Section

Visible when `business_type ≠ MARKETPLACE`.

| Path | Auth | Description |
|------|------|-------------|
| `/cafe/pos` | authenticated | POS cashier — product grid, cart, checkout |
| `/cafe/orders` | authenticated | Order list with status filters |
| `/cafe/orders/$id` | authenticated | Order detail — items, status, payment |
| `/cafe/kitchen` | authenticated | Kitchen display — real-time order updates via SSE |
| `/cafe/tables` | root, admin | Table management — create, rename, delete, QR code |
| `/cafe/products` | authenticated | Product catalog — list, search, filter by category |
| `/cafe/products/new` | root, admin, warehouse_admin | Create product form |
| `/cafe/products/$id` | authenticated | Product detail — info, stock history, recipe |
| `/cafe/products/$id/edit` | root, admin, warehouse_admin | Edit product form |
| `/cafe/ingredients` | authenticated | Ingredients overview — materials + recipes list |

---

### Stock Section

Requires `canViewStock` (root, admin, warehouse_admin, accountant).

| Path | Auth | Description |
|------|------|-------------|
| `/stock` | canViewStock | Warehouse list |
| `/stock/warehouses/$id` | canViewStock | Warehouse detail — racks, SKUs |
| `/stock/skus` | canViewStock | SKU list — search, filter by warehouse |
| `/stock/skus/$id` | canViewStock | SKU detail — placements, cost versions, stock logs |
| `/stock/transactions` | canViewStock | Stock transaction list |
| `/stock/transactions/$id` | canViewStock | Transaction detail — logs, cost versions |
| `/stock/placement` | canViewStock | Rack placement overview |
| `/stock/placement/$id` | canViewStock | Rack detail — current SKU placements |
| `/stock/placement/$id/adjust` | canViewStock | Adjust qty of a SKU in a rack |

---

### Marketplace Section

Visible when `business_type ≠ CAFE`.

| Path | Auth | Description |
|------|------|-------------|
| `/marketplace/shop` | root, admin | Shop list |
| `/marketplace/shop/new` | root, admin | Create shop form |
| `/marketplace/shop/$id` | root, admin | Shop detail — info, orders |
| `/marketplace/shop/$id/edit` | root, admin | Edit shop form |
| `/marketplace/products` | canManageMarketplace | Marketplace product catalog |
| `/marketplace/products/new` | canManageMarketplace | Create marketplace product |
| `/marketplace/products/$id` | canManageMarketplace | Product detail — per-warehouse stock |
| `/marketplace/products/$id/edit` | canManageMarketplace | Edit marketplace product |
| `/marketplace/orders` | canViewOrders | Order list — filter by shop, warehouse, status, date |
| `/marketplace/orders/new` | canManageMarketplace | Create order form |
| `/marketplace/orders/$id` | canViewOrders | Order detail — items, status, shipping info |
| `/marketplace/customers` | canManageMarketplace | Customer list — search |
| `/marketplace/customers/new` | canManageMarketplace | Create customer form |
| `/marketplace/customers/$id` | canManageMarketplace | Customer detail — addresses, order history |
| `/marketplace/customers/$id/edit` | canManageMarketplace | Edit customer form |

---

## Role Helper Reference

Used in `beforeLoad` guards and UI visibility checks (`frontend/src/lib/roles.ts`):

| Helper | Roles |
|--------|-------|
| `isRootOrAdmin` | root, admin |
| `canManageProducts` | root, admin, warehouse_admin |
| `canViewStock` | root, admin, warehouse_admin, accountant |
| `canManageMarketplace` | root, admin, warehouse_admin |
| `canViewOrders` | root, admin, warehouse_admin, accountant |
| `canViewTransactions` | root, admin, accountant |

---

## Business Type Routing

The sidebar and section visibility adapt based on `settings.business_type`:

| Value | Cafe section | Marketplace section |
|-------|-------------|---------------------|
| `BUSINESS_TYPE_CAFE` | shown | hidden |
| `BUSINESS_TYPE_MARKETPLACE` | hidden | shown |
| `BUSINESS_TYPE_UNSPECIFIED` | shown | shown |
