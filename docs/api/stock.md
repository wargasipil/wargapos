# StockService

Package: `wargapos.stock.v1`

See [Stock System](../backend/stock-system.md) for a conceptual overview of warehouses, SKUs, cost versioning, and rack placement.

## RPCs

### Warehouse

| Method | Auth | Description |
|--------|------|-------------|
| `CreateWarehouse` | root, admin, warehouse_admin | Create a warehouse |
| `UpdateWarehouse` | root, admin, warehouse_admin | Update warehouse details |
| `DeleteWarehouse` | root, admin, warehouse_admin | Delete a warehouse |
| `ListWarehouse` | root, admin, warehouse_admin, accountant | List warehouses |
| `GetWarehouse` | root, admin, warehouse_admin, accountant | Get warehouse by ID |

### Rack

| Method | Auth | Description |
|--------|------|-------------|
| `CreateRack` | root, admin, warehouse_admin | Create a rack in a warehouse |
| `UpdateRack` | root, admin, warehouse_admin | Rename a rack |
| `DeleteRack` | root, admin, warehouse_admin | Delete a rack |
| `ListRack` | root, admin, warehouse_admin, accountant | List racks |
| `GetRack` | root, admin, warehouse_admin, accountant | Get rack by ID |

### SKU

| Method | Auth | Description |
|--------|------|-------------|
| `CreateSku` | root, admin, warehouse_admin | Create a SKU |
| `GetSku` | root, admin, warehouse_admin, accountant | Get SKU by ID or code |
| `UpdateSku` | root, admin, warehouse_admin | Update SKU fields |
| `DeleteSku` | root, admin, warehouse_admin | Delete a SKU |
| `ListSku` | root, admin, warehouse_admin, accountant | List SKUs with filters |
| `ListSkuPlacement` | root, admin, warehouse_admin, accountant | List rack placements for a SKU |
| `ListCostSku` | root, admin, warehouse_admin, accountant | List cost versions for a SKU |
| `ListStockLogSku` | root, admin, warehouse_admin, accountant | List stock logs for a SKU |

### Transactions

| Method | Auth | Description |
|--------|------|-------------|
| `CreateTransaction` | root, admin, warehouse_admin | Create a stock-in/out transaction |
| `ListTransaction` | root, admin, warehouse_admin, accountant | Paginated transaction list |
| `DetailTransaction` | root, admin, warehouse_admin, accountant | Get transaction details |
| `CancelTransaction` | root, admin, warehouse_admin | Cancel an uncommitted transaction |

### Legacy Adjust (simple products)

| Method | Auth | Description |
|--------|------|-------------|
| `AdjustStock` | root, admin, warehouse_admin | Adjust stock on a product directly |
| `ListStockMovements` | root, admin, warehouse_admin, accountant | List adjustment history |

### Rack Placement

| Method | Auth | Description |
|--------|------|-------------|
| `ListRackPlacement` | root, admin, warehouse_admin, accountant | List all placements in a rack |
| `ListPlacementLog` | root, admin, warehouse_admin, accountant | Placement movement history |
| `AdjustPlacement` | root, admin, warehouse_admin | Set qty of SKU in a specific rack |
| `MovePlacement` | root, admin, warehouse_admin | Transfer SKU stock between racks |

---

## Key Concepts

### SKU Code Convention

Marketplace products use: `MP-{marketplace_product_id}-{warehouse_id}`

### Costing Types

| Type | Order |
|------|-------|
| `FIFO` | Oldest batch first |
| `LIFO` | Newest batch first |
| `MAX_PRICE` | Most expensive batch first |
| `MIN_PRICE` | Cheapest batch first |

### Transaction Types

| Type | Description |
|------|-------------|
| `STOCK_IN` | Receiving inventory |
| `STOCK_OUT` | Shipping/consuming inventory |
| `ADJUSTMENT` | Manual correction |
| `PROVISION` | Reserved for an order |
| `PROVISION_CANCEL` | Unreserve cancelled order |

---

## AdjustStock (legacy)

```
rpc AdjustStock(AdjustStockRequest) returns (AdjustStockResponse)
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product_id` | int64 | yes | > 0 |
| `delta` | int32 | yes | Non-zero; positive = in, negative = out |
| `reason` | string | yes | `"restock"` or `"adjustment"` |
| `note` | string | no | Free-text note |

**Response:** `{ new_stock_qty: int32 }`
