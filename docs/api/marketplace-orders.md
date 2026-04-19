# MarketplaceOrderService

Package: `wargapos.marketplace_order.v1`

Manages marketplace orders, customers, and customer addresses. For shop and product management see [MarketplaceService](marketplace.md).

## RPCs

### Orders

| Method | Auth | Description |
|--------|------|-------------|
| `CreateOrder` | root, admin, warehouse_admin | Create a marketplace order |
| `GetOrder` | root, admin, accountant, warehouse_admin | Get order by ID |
| `ListOrders` | root, admin, accountant, warehouse_admin | Paginated order list with filters |
| `UpdateOrderStatus` | root, admin, warehouse_admin | Update order status |

### Customers

| Method | Auth | Description |
|--------|------|-------------|
| `CreateCustomer` | root, admin, warehouse_admin | Create a customer record |
| `GetCustomer` | root, admin, accountant, warehouse_admin | Get customer by ID |
| `UpdateCustomer` | root, admin, warehouse_admin | Update customer details |
| `DeleteCustomer` | root, admin, warehouse_admin | Delete a customer |
| `ListCustomers` | root, admin, accountant, warehouse_admin | Paginated + searchable customer list |

### Customer Addresses

| Method | Auth | Description |
|--------|------|-------------|
| `CreateCustomerAddress` | root, admin, warehouse_admin | Add address to customer |
| `UpdateCustomerAddress` | root, admin, warehouse_admin | Update an address |
| `DeleteCustomerAddress` | root, admin, warehouse_admin | Remove an address |
| `ListCustomerAddresses` | root, admin, accountant, warehouse_admin | List all addresses for a customer |

---

## Key Objects

### MarketplaceOrder

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint64 | Order ID |
| `shop_id` | uint64 | FK to shop |
| `customer_id` | uint64 | FK to customer |
| `warehouse_id` | uint32 | FK to warehouse |
| `customer_name` | string | Snapshot of name |
| `phone_number` | string | Contact number |
| `total_cents` | int64 | Total in IDR cents |
| `status` | MarketplaceOrderStatus | Current status |
| `items` | MarketplaceOrderItem[] | Line items |
| `receipt` | string | External receipt/invoice number |
| `shipping_address` | string | Delivery address |
| `note` | string | Order notes |

### MarketplaceOrderStatus

| Value | Description |
|-------|-------------|
| `PENDING` | New order |
| `PROCESSING` | Being prepared |
| `SHIPPED` | Dispatched |
| `DELIVERED` | Delivered |
| `CANCELLED` | Cancelled |

### MarketplaceCustomer

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint64 | Customer ID |
| `name` | string | Full name |
| `phone_number` | string | Phone number |
| `addresses` | CustomerAddress[] | Saved addresses |

### CustomerAddress

| Field | Type | Description |
|-------|------|-------------|
| `id` | uint64 | Address ID |
| `customer_id` | uint64 | FK to customer |
| `label` | string | Label (e.g. "Home") |
| `address` | string | Street address |
| `city` | string | City |
| `province` | string | Province |
| `postal_code` | string | Postal code |

---

## CreateOrder

```
rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse)
```

| Field | Type | Notes |
|-------|------|-------|
| `shop_id` | uint64 | |
| `customer_name` | string | |
| `phone_number` | string | |
| `items` | MarketplaceOrderItem[] | Line items |
| `warehouse_id` | uint32 | |
| `customer_id` | uint64 | Optional — link to existing customer |
| `address_id` | uint64 | Optional — use saved address |
| `note` | string | |
| `receipt` | string | External receipt number |
| `receipt_file` | string | URL to receipt image |
| `shipping_address` | string | |
| `shipping_city` | string | |
| `shipping_province` | string | |
| `shipping_postal_code` | string | |
| `shipping_label` | string | |

**Response:** `{ order: MarketplaceOrder }`

---

## ListOrders

```
rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse)
```

| Field | Type | Description |
|-------|------|-------------|
| `page` | int32 | 1-based |
| `page_size` | int32 | Per page |
| `status_filter` | MarketplaceOrderStatus | Filter by status |
| `shop_id` | uint64 | Filter by shop |
| `customer_id` | uint64 | Filter by customer |
| `date_from` | string | `"2006-01-02"` inclusive |
| `date_to` | string | `"2006-01-02"` inclusive |
| `warehouse_id` | uint32 | Filter by warehouse |
| `search` | string | Search customer name / receipt |

**Response:** `{ orders: MarketplaceOrder[], total: int32 }`
