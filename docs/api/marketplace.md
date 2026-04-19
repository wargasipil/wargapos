# MarketplaceService

Package: `wargapos.marketplace.v1`

Manages marketplace storefronts (shops) and the product catalog. For orders, customers, and addresses see [MarketplaceOrderService](marketplace-orders.md).

## RPCs

### Shops

| Method | Auth | Description |
|--------|------|-------------|
| `CreateShop` | root, admin | Create a marketplace storefront |
| `GetShop` | public | Get shop by ID |
| `UpdateShop` | root, admin | Update shop details |
| `DeleteShop` | root, admin | Delete a shop |
| `ListShops` | root, admin | Paginated shop list |

### Products

| Method | Auth | Description |
|--------|------|-------------|
| `CreateProduct` | root, admin, warehouse_admin | Create a marketplace product |
| `GetProduct` | root, admin, accountant, warehouse_admin | Get product by ID |
| `UpdateProduct` | root, admin, warehouse_admin | Update product details |
| `DeleteProduct` | root, admin, warehouse_admin | Delete a product |
| `ListProducts` | root, admin, accountant, warehouse_admin | Paginated product list |
| `RestockProduct` | root, admin, warehouse_admin | Add stock to a product's warehouse SKU |

---

## Key Objects

### MarketplaceShop

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint64 | Shop ID |
| `name` | string | Shop display name |
| `type` | MarketplaceShopType | SHOPEE, TOKOPEDIA, LAZADA, OTHER |
| `username` | string | Username on the platform |
| `url` | string | Shop URL |
| `is_active` | bool | Whether shop is active |

### MarketplaceProduct

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint64 | Product ID |
| `name` | string | Product name |
| `description` | string | Description |
| `price_cents` | int64 | Price in IDR cents |
| `image_url` | string | Product image |
| `is_active` | bool | Whether listed |
| `stocks` | MarketplaceProductStock[] | Per-warehouse stock |

---

## Shop RPCs

### CreateShop

```
rpc CreateShop(CreateShopRequest) returns (CreateShopResponse)
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | yes |
| `type` | MarketplaceShopType | yes |
| `username` | string | no |
| `url` | string | no |

**Response:** `{ shop: MarketplaceShop }`

### UpdateShop

```
rpc UpdateShop(UpdateShopRequest) returns (UpdateShopResponse)
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | uint64 | required |
| `name` | string | |
| `type` | MarketplaceShopType | |
| `username` | string | |
| `url` | string | |
| `is_active` | bool | |

### ListShops

```
rpc ListShops(ListShopsRequest) returns (ListShopsResponse)
```

| Field | Type | Description |
|-------|------|-------------|
| `page` | int32 | 1-based |
| `page_size` | int32 | Per page |
| `search` | string | Name search |
| `active_only` | bool | Only active shops |

---

## Product RPCs

### CreateProduct

```
rpc CreateProduct(CreateProductRequest) returns (CreateProductResponse)
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | yes |
| `description` | string | no |
| `price_cents` | int64 | yes |
| `image_url` | string | no |

### RestockProduct

```
rpc RestockProduct(RestockProductRequest) returns (RestockProductResponse)
```

Adds stock to the SKU `MP-{product_id}-{warehouse_id}`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product_id` | uint64 | yes | |
| `warehouse_id` | uint32 | yes | |
| `delta` | int32 | yes | Quantity to add |
| `total` | double | yes | Total cost > 0 (unit_cost = total/delta) |

**Response:** `{ product: MarketplaceProduct }`
