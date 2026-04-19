# Database Schema

All tables use PostgreSQL. Migrations are managed by [Goose](https://github.com/pressly/goose) and live in `backend/migrations/`.

## Core Tables

### users

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | Auto-increment (migrated to UINT32 range) |
| `username` | TEXT UNIQUE | Login name |
| `full_name` | TEXT | Display name |
| `email` | TEXT UNIQUE | Email address |
| `password_hash` | TEXT | bcrypt hash |
| `role` | TEXT | `root`, `admin`, `warehouse_admin`, `accountant`, `cashier` |
| `is_active` | BOOLEAN | Default true |
| `image_url` | TEXT | Profile photo URL |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### categories

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `name` | TEXT UNIQUE | Category name |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### products

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `name` | TEXT | |
| `description` | TEXT | |
| `category_id` | BIGINT FK → categories | ON DELETE SET NULL |
| `price_cents` | BIGINT | Selling price in IDR cents |
| `is_active` | BOOLEAN | Default true |
| `sku` | TEXT UNIQUE | |
| `image_url` | TEXT | |
| `cogs_cents` | BIGINT | Cost of goods sold |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### tables

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `name` | TEXT | Display name |
| `uuid` | TEXT UNIQUE | Used in QR code URL |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## Order Tables

### orders

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `session_token` | TEXT UNIQUE | Cart session identifier |
| `cashier_id` | BIGINT FK → users | ON DELETE SET NULL |
| `total_cents` | BIGINT | Order total in IDR cents |
| `status` | TEXT | `pending`, `cancelled`, `prepared`, `delivered` |
| `payment_status` | TEXT | `unpaid`, `paid`, `refunded` |
| `payment_method` | TEXT | `cash`, `midtrans`, `manual_qris`, `manual_transfer` |
| `order_from` | TEXT | `guest`, `pos` |
| `table_id` | BIGINT FK → tables | ON DELETE SET NULL |
| `snap_token` | TEXT | Midtrans Snap token |
| `customer_name` | TEXT | |
| `phone_number` | TEXT | |
| `cash_tendered_cents` | BIGINT | Cash received |
| `change_cents` | BIGINT | Change returned |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### order_items

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `order_id` | BIGINT FK → orders | ON DELETE CASCADE |
| `product_id` | BIGINT FK → products | ON DELETE SET NULL |
| `product_name` | TEXT | Snapshot at time of order |
| `quantity` | INT | |
| `unit_price_cents` | BIGINT | |
| `subtotal_cents` | BIGINT | |
| `notes` | TEXT | Special instructions |
| `created_at` | TIMESTAMPTZ | |

---

## Notification & Settings Tables

### notifications

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `type` | INT | NotificationType enum |
| `title` | TEXT | |
| `body` | TEXT | |
| `order_id` | BIGINT FK → orders | |
| `is_read` | BOOLEAN | Default false |
| `created_at` | TIMESTAMPTZ | |

### settings

Stores all application settings as a single JSON-like row. Fields include Midtrans keys, manual payment info, printer settings, backup config, and business type.

---

## Stock Tables

### warehouses

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `name` | VARCHAR(300) | |
| `address` | TEXT | |
| `contact` | TEXT | |
| `deleted` | BOOLEAN | Soft delete |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### racks

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `warehouse_id` | INT FK → warehouses | |
| `name` | TEXT | |
| `deleted` | BOOLEAN | Soft delete |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### skus

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `code` | VARCHAR(255) UNIQUE | e.g. `MP-{productId}-{warehouseId}` |
| `product_id` | INT | FK to product or material |
| `warehouse_id` | INT FK → warehouses | |
| `stock_qty` | INT | Current quantity on hand |
| `costing_type` | TEXT | `FIFO`, `LIFO`, `MAX_PRICE`, `MIN_PRICE` |
| `last_stock_in` | TIMESTAMPTZ | Last inbound timestamp |
| `last_stock_out` | TIMESTAMPTZ | Last outbound timestamp |
| `sku_product_type` | TEXT | `product`, `ingredient`, `marketplace` |
| `deleted` | BOOLEAN | Soft delete |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### stock_transactions

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `sku_id` | INT FK → skus | |
| `transaction_type` | TEXT | `STOCK_IN`, `STOCK_OUT`, `ADJUSTMENT`, `PROVISION`, `PROVISION_CANCEL` |
| `total` | NUMERIC | Total cost of this transaction |
| `note` | TEXT | |
| `cancelled` | BOOLEAN | Whether transaction was cancelled |
| `placement_status` | TEXT | `pending`, `placed` |
| `receipt` | TEXT | External receipt number |
| `created_by` | INT FK → users | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### stock_logs

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `sku_id` | INT FK → skus | |
| `transaction_id` | BIGINT FK → stock_transactions | |
| `cost_version_id` | BIGINT FK → cost_versions | |
| `change` | INT | Positive = in, negative = out |
| `log_type` | TEXT | `STOCK_IN`, `STOCK_OUT`, `STOCK_CANCEL` |
| `created_at` | TIMESTAMPTZ | |

### cost_versions

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `sku_id` | INT FK → skus | |
| `transaction_id` | BIGINT FK → stock_transactions | |
| `unit_cost` | DOUBLE PRECISION | Cost per unit |
| `stock_initiate` | INT | Original quantity received |
| `left_stock` | INT | Remaining unconsumed quantity |
| `created_at` | TIMESTAMPTZ | |

### sku_rack_placements

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `sku_id` | INT FK → skus | |
| `rack_id` | INT FK → racks | |
| `qty` | INT | Current qty of SKU in this rack |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### placement_logs

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `sku_id` | INT FK → skus | |
| `rack_id` | INT FK → racks | |
| `change` | INT | Positive = added, negative = removed |
| `note` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

---

## Ingredient Tables

### materials

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `code` | VARCHAR(100) UNIQUE | |
| `name` | VARCHAR(300) | |
| `qty_type` | INT | 1 = PIECE, 2 = GRAM |
| `qty` | INT | Current stock |
| `branch_id` | INT | (legacy) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### recipes

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `product_id` | INT FK → products | |
| `name` | VARCHAR(300) | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### recipe_items

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `recipe_id` | INT FK → recipes | ON DELETE CASCADE |
| `material_id` | INT FK → materials | |
| `qty` | INT | Quantity needed per product unit |

---

## Marketplace Tables

### marketplace_shops

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `name` | VARCHAR | |
| `type` | INT | 0=OTHER, 1=SHOPEE, 2=TOKOPEDIA, 3=LAZADA |
| `username` | VARCHAR | Platform username |
| `url` | TEXT | Shop URL |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### marketplace_products

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `name` | TEXT | |
| `description` | TEXT | |
| `price_cents` | BIGINT | IDR cents |
| `image_url` | TEXT | |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### marketplace_product_stocks

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `marketplace_product_id` | BIGINT FK → marketplace_products | |
| `warehouse_id` | INT FK → warehouses | |
| `sku_id` | INT FK → skus | Links to `MP-{product_id}-{warehouse_id}` |
| `left_stock` | INT | Current stock for this product+warehouse |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### marketplace_customers

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `name` | VARCHAR | Full name |
| `phone_number` | VARCHAR | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### customer_addresses

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `customer_id` | BIGINT FK → marketplace_customers | |
| `label` | VARCHAR | e.g. "Home", "Office" |
| `address` | TEXT | Street address |
| `city` | VARCHAR | |
| `province` | VARCHAR | |
| `postal_code` | VARCHAR | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### marketplace_orders

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `shop_id` | BIGINT FK → marketplace_shops | |
| `customer_id` | BIGINT FK → marketplace_customers | Nullable |
| `warehouse_id` | INT FK → warehouses | |
| `customer_name` | VARCHAR | Snapshot |
| `phone_number` | VARCHAR | |
| `total_cents` | BIGINT | IDR cents |
| `status` | INT | Order status enum |
| `note` | TEXT | |
| `receipt` | TEXT | External receipt number |
| `receipt_file` | TEXT | URL to receipt image |
| `shipping_address` | TEXT | |
| `shipping_city` | VARCHAR | |
| `shipping_province` | VARCHAR | |
| `shipping_postal_code` | VARCHAR | |
| `shipping_label` | VARCHAR | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### marketplace_order_items

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `order_id` | BIGINT FK → marketplace_orders | ON DELETE CASCADE |
| `item_name` | TEXT | Free-text item name |
| `quantity` | INT | |
| `unit_price_cents` | BIGINT | |
| `subtotal_cents` | BIGINT | |
