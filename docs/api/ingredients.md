# IngredientService

Package: `wargapos.ingredient.v1`

Manages raw materials and product recipes. When an order is fulfilled, the recipe for each product is used to provision stock from the corresponding material SKUs.

## RPCs

### Materials

| Method | Auth | Description |
|--------|------|-------------|
| `CreateMaterial` | root, admin, warehouse_admin | Create a raw material |
| `UpdateMaterial` | root, admin, warehouse_admin | Update material details |
| `GetMaterial` | root, admin, warehouse_admin, cashier | Get material by ID |
| `ListMaterial` | root, admin, warehouse_admin, cashier | Paginated material list |
| `DeleteMaterial` | root, admin, warehouse_admin | Delete a material |
| `AddMaterialStock` | root, admin, warehouse_admin | Add stock to a material |

### Recipes

| Method | Auth | Description |
|--------|------|-------------|
| `CreateRecipe` | root, admin, warehouse_admin | Create a recipe for a product |
| `UpdateRecipe` | root, admin, warehouse_admin | Update recipe items |
| `GetRecipe` | root, admin, warehouse_admin, cashier | Get recipe by product ID |
| `ListRecipe` | root, admin, warehouse_admin, cashier | Paginated recipe list |
| `DeleteRecipe` | root, admin, warehouse_admin | Delete a recipe |

---

## Key Objects

### Material

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint32 | Material ID |
| `code` | string | Unique material code |
| `name` | string | Display name |
| `qty_type` | QtyType | `PIECE` or `GRAM` |
| `qty` | int32 | Current stock quantity |

### Recipe

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint32 | Recipe ID |
| `product_id` | uint32 | FK to product |
| `name` | string | Recipe name |
| `items` | RecipeItem[] | Ingredients |

### RecipeItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint32 | Item ID |
| `material_id` | uint32 | FK to material |
| `material` | Material | Embedded material |
| `qty` | int32 | Quantity needed per unit |

---

## CreateMaterial

```
rpc CreateMaterial(CreateMaterialRequest) returns (CreateMaterialResponse)
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `code` | string | yes | 1–100 chars |
| `name` | string | yes | 1–300 chars |
| `qty_type` | QtyType | yes | PIECE or GRAM (not UNSPECIFIED) |

**Response:** `{ material: Material }`

---

## AddMaterialStock

```
rpc AddMaterialStock(AddMaterialStockRequest) returns (AddMaterialStockResponse)
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | uint32 | yes | Material ID |
| `warehouse_id` | uint32 | yes | > 0 |
| `qty` | int32 | yes | Non-zero |
| `price` | uint64 | yes | > 0 (IDR cents) |
| `note` | string | no | max 500 chars |

---

## CreateRecipe

```
rpc CreateRecipe(CreateRecipeRequest) returns (CreateRecipeResponse)
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product_id` | uint32 | yes | > 0 |
| `name` | string | yes | 1–300 chars |
| `items` | RecipeItemInput[] | yes | min 1 item |

Each `RecipeItemInput`: `{ material_id: uint32, qty: int32 }` (both > 0)

**Response:** `{ recipe: Recipe }`
