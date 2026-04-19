# Stock System

## Overview

The stock system tracks physical inventory across warehouses using a cost-versioning approach that supports FIFO, LIFO, max-price, and min-price costing strategies.

## Core Concepts

### Hierarchy

```
Warehouse
  └── Rack (physical shelf/location)
        └── SKU Rack Placement (qty of a SKU stored in this rack)

SKU (Stock Keeping Unit)
  └── Linked to a Product + Warehouse
  └── Has stock_qty (current quantity)
  └── Has cost_versions (price history)
  └── Has stock_logs (movement history)
```

### SKU

A SKU represents one product in one warehouse. It has:
- `code` — unique identifier (e.g. `MP-{productId}-{warehouseId}` for marketplace)
- `stock_qty` — current quantity on hand
- `costing_type` — FIFO, LIFO, MAX_PRICE, or MIN_PRICE
- `last_stock_in` / `last_stock_out` — timestamps for quick filtering

### Cost Version

Every stock-in operation creates a `cost_version` record:
- `unit_cost` — cost per unit for this batch
- `stock_initiate` — original quantity received
- `left_stock` — remaining unconsumed quantity
- `transaction_id` — links back to the stock transaction

Cost versions are consumed in order according to the SKU's costing type.

### Stock Log

Every stock movement (in, out, cancel) writes a `stock_log` with:
- `change` — positive (in) or negative (out)
- `log_type` — `STOCK_IN`, `STOCK_OUT`, `STOCK_CANCEL`
- `cost_version_id` — which cost version was affected

## Stock Core Functions

Located in `backend/internal/service/stock_service/stock_core/`.

### `SkuStockAdd`

Adds stock to a SKU. Used for stock-in transactions.

```
1. Pessimistically lock the SKU row
2. Compute unit_cost = total / qty
3. Create a new cost_version record
4. Write a STOCK_IN log
5. Increment sku.stock_qty
6. Update sku.last_stock_in
```

### `SkuStockProvision`

Allocates stock for consumption (e.g. when an order uses ingredients). Respects the SKU's costing type.

```
1. Pessimistically lock the SKU row
2. Query cost_versions ordered by costing type:
   - FIFO → oldest first (created_at ASC)
   - LIFO → newest first (created_at DESC)
   - MAX_PRICE → most expensive first
   - MIN_PRICE → cheapest first
3. Walk versions, allocating from left_stock until qty is satisfied
4. Return PriceProvision[] (qty + cost_version_id pairs)
5. Caller writes STOCK_OUT logs and decrements cost version left_stock
```

### `SkuStockCancel`

Cancels an unused provision (e.g. when an order is cancelled before fulfilment).

```
1. Lock the SKU row
2. Find cost_version for this transaction
3. Verify stock_initiate == left_stock (entire batch unused)
4. Set left_stock = 0
5. Write STOCK_CANCEL log
6. Decrement sku.stock_qty
```

## Rack Placement

SKUs can be physically placed in racks within a warehouse:

- `sku_rack_placements` — current qty of a SKU in each rack
- `placement_logs` — history of all placement movements

### Placement Operations

| Operation | Description |
|-----------|-------------|
| `AdjustPlacement` | Set the quantity of a SKU in a specific rack |
| `MovePlacement` | Transfer a SKU's stock from one rack to another |

Placement status is tracked on stock transactions (`placement_status`) to know if inbound stock has been shelved yet.

## Stock Transaction Types

| Type | Description |
|------|-------------|
| `STOCK_IN` | Receiving inventory |
| `STOCK_OUT` | Consuming/shipping inventory |
| `ADJUSTMENT` | Manual correction |
| `PROVISION` | Reserved for an order |
| `PROVISION_CANCEL` | Unreserve cancelled order |

## Marketplace Integration

Marketplace products use dedicated SKUs with the naming convention:

```
MP-{marketplace_product_id}-{warehouse_id}
```

When a marketplace order is placed, stock is provisioned from these SKUs. When `RestockProduct` is called, `SkuStockAdd` is invoked to add to the corresponding SKU.
