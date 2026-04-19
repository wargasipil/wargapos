# ProductService

Package: `wargapos.product.v1`

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `CreateProduct` | root, admin, warehouse_admin | Create a product |
| `GetProduct` | public | Get a single product |
| `ListProducts` | public | Paginated product list with filters |
| `UpdateProduct` | root, admin, warehouse_admin | Update product fields |
| `DeleteProduct` | root, admin, warehouse_admin | Delete a product |
| `CreateCategory` | root, admin, warehouse_admin | Create a category |
| `UpdateCategory` | root, admin, warehouse_admin | Rename a category |
| `DeleteCategory` | root, admin, warehouse_admin | Delete a category |
| `ListCategories` | public | List all categories |

---

### Product object

| Field | Type | Description |
|-------|------|-------------|
| `id` | int64 | Product ID |
| `name` | string | Product name |
| `description` | string | Description |
| `category_id` | int64 | FK to category |
| `price_cents` | int64 | Selling price in IDR cents |
| `is_active` | bool | Whether product appears on menu |
| `sku` | string | Stock keeping unit code |
| `image_url` | string | Product image |
| `cogs_cents` | int64 | Cost of goods sold (IDR cents) |
| `stock_qty` | int32 | Current stock quantity |

### Category object

| Field | Type | Description |
|-------|------|-------------|
| `id` | int64 | Category ID |
| `name` | string | Category name |

---

### CreateProduct

```
rpc CreateProduct(CreateProductRequest) returns (CreateProductResponse)
```

**Request**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | min 1 char |
| `description` | string | no | |
| `category_id` | int64 | yes | > 0 |
| `price_cents` | int64 | yes | > 0 |
| `sku` | string | yes | min 1 char |
| `image_url` | string | no | |
| `cogs_cents` | int64 | no | |

**Response:** `{ product: Product }`

---

### GetProduct

```
rpc GetProduct(GetProductRequest) returns (GetProductResponse)
```

**Request:** `{ id: int64 }`
**Response:** `{ product: Product }`

---

### ListProducts

```
rpc ListProducts(ListProductsRequest) returns (ListProductsResponse)
```

**Request**

| Field | Type | Description |
|-------|------|-------------|
| `page` | int32 | 1-based page |
| `page_size` | int32 | Per page |
| `category_id` | int64 | Filter by category |
| `active_only` | bool | Only active products |
| `inactive_only` | bool | Only inactive products |
| `search` | string | Name search |

**Response:** `{ products: Product[], total: int32 }`

---

### UpdateProduct

```
rpc UpdateProduct(UpdateProductRequest) returns (UpdateProductResponse)
```

All fields except `id` are optional (partial update):

| Field | Type | Notes |
|-------|------|-------|
| `id` | int64 | required, > 0 |
| `name` | string | |
| `price_cents` | int64 | |
| `is_active` | bool | |
| `image_url` | string | |
| `description` | string | |
| `sku` | string | |
| `category_id` | int64 | |
| `cogs_cents` | int64 | |

**Response:** `{ product: Product }`

---

### DeleteProduct

```
rpc DeleteProduct(DeleteProductRequest) returns (DeleteProductResponse)
```

**Request:** `{ id: int64 }`

---

### CreateCategory / UpdateCategory / DeleteCategory / ListCategories

```
rpc CreateCategory(CreateCategoryRequest) returns (CreateCategoryResponse)
rpc UpdateCategory(UpdateCategoryRequest) returns (UpdateCategoryResponse)
rpc DeleteCategory(DeleteCategoryRequest) returns (DeleteCategoryResponse)
rpc ListCategories(ListCategoriesRequest) returns (ListCategoriesResponse)
```

| Method | Request fields |
|--------|----------------|
| Create | `name` (string, required) |
| Update | `id` (int64, required), `name` (string, required) |
| Delete | `id` (int64, required) |
| List | — (returns all categories) |
