# TransactionService

Package: `wargapos.transaction.v1`

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `AddToCart` | public | Add item to a guest/POS cart |
| `RemoveFromCart` | public | Remove item from cart |
| `GetCart` | public | Get current cart state |
| `Checkout` | public | Submit cart as an order |
| `GetOrder` | public | Fetch an order by ID |
| `ListOrders` | root, admin, accountant, cashier | Paginated order list with filters |
| `CreatePaymentToken` | public | Create Midtrans Snap token for payment |
| `MarkOrderPaid` | root, admin, cashier | Mark order as paid |
| `CancelOrder` | root, admin, cashier | Cancel an order |
| `MarkOrderReady` | root, admin, cashier | Mark order as prepared/ready |
| `MarkOrderDelivered` | root, admin, cashier | Mark order as delivered |
| `GetDashboardStats` | authenticated | Revenue + order stats |
| `Subscribe` | — | Server-sent event stream for kitchen display |
| `Push` | — | Push a notification to subscribers |

---

## Enums

### OrderStatus

| Value | Description |
|-------|-------------|
| `ORDER_STATUS_PENDING` | Awaiting preparation |
| `ORDER_STATUS_CANCELLED` | Order cancelled |
| `ORDER_STATUS_PREPARED` | Ready for pickup/delivery |
| `ORDER_STATUS_DELIVERED` | Delivered to customer |

### PaymentStatus

| Value | Description |
|-------|-------------|
| `PAYMENT_STATUS_UNPAID` | Not yet paid |
| `PAYMENT_STATUS_PAID` | Payment confirmed |
| `PAYMENT_STATUS_REFUNDED` | Payment refunded |

### PaymentMethod

| Value | Description |
|-------|-------------|
| `PAYMENT_METHOD_CASH` | Cash at counter |
| `PAYMENT_METHOD_MIDTRANS` | Midtrans Snap (card/QRIS/transfer via gateway) |
| `PAYMENT_METHOD_MANUAL_QRIS` | Customer scans staff QR; staff confirms manually |
| `PAYMENT_METHOD_MANUAL_TRANSFER` | Bank transfer; staff confirms manually |

### OrderFrom

| Value | Description |
|-------|-------------|
| `ORDER_FROM_GUEST` | Self-service from `/menu` |
| `ORDER_FROM_POS` | Staff-placed from POS |

---

## Key Objects

### Order

| Field | Type | Description |
|-------|------|-------------|
| `id` | int64 | Order ID |
| `cashier_id` | uint32 | Staff who placed the order |
| `items` | OrderItem[] | Line items |
| `total_cents` | int64 | Total in IDR cents |
| `status` | OrderStatus | Current status |
| `created_at` | Timestamp | Creation time |
| `table_id` | int64 | Dine-in table (0 if takeaway) |
| `customer_name` | string | Customer name |
| `phone_number` | string | Customer phone |
| `payment_method` | PaymentMethod | How paid |
| `order_from` | OrderFrom | Guest or POS |
| `payment_status` | PaymentStatus | Payment state |
| `cash_tendered_cents` | int64 | Cash received |
| `change_cents` | int64 | Change returned |

### OrderItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | int64 | Item ID |
| `product_id` | int64 | Product FK |
| `product_name` | string | Snapshot of product name |
| `quantity` | int32 | Quantity |
| `unit_price_cents` | int64 | Price per unit |
| `subtotal_cents` | int64 | quantity × unit_price |
| `notes` | string | Special instructions |

---

## AddToCart / RemoveFromCart / GetCart

Cart is session-based (identified by `session_id`) and does not require authentication.

```
rpc AddToCart(AddToCartRequest) returns (AddToCartResponse)
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `session_id` | string | yes | Client-generated UUID |
| `product_id` | int64 | yes | > 0 |
| `quantity` | int32 | yes | > 0 |
| `table_id` | int64 | no | Dine-in table |
| `notes` | string | no | Item notes |

`GetCart` takes only `{ session_id }`. `RemoveFromCart` takes `{ session_id, product_id }`.

All three return `{ cart: Order }`.

---

## Checkout

```
rpc Checkout(CheckoutRequest) returns (CheckoutResponse)
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `session_id` | string | yes | Must match existing cart |
| `cashier_id` | uint32 | no | Staff ID (POS flow) |
| `payment_method` | PaymentMethod | yes | Must not be UNSPECIFIED |
| `customer_name` | string | no | |
| `phone_number` | string | no | |
| `order_from` | OrderFrom | no | Defaults to GUEST |
| `cash_tendered_cents` | int64 | no | For CASH payments |

**Response:** `{ order: Order }`

---

## GetDashboardStats

```
rpc GetDashboardStats(GetDashboardStatsRequest) returns (GetDashboardStatsResponse)
```

**Request**

| Field | Type | Description |
|-------|------|-------------|
| `period` | DashboardPeriod | TODAY, THIS_WEEK, or THIS_MONTH |

**Response**

| Field | Type | Description |
|-------|------|-------------|
| `total_revenue_cents` | int64 | Total paid revenue |
| `order_counts` | DashboardOrderCounts | Count by status |
| `top_products` | DashboardTopProduct[] | Best selling products |
| `recent_orders` | Order[] | Latest orders |
| `payment_breakdown` | DashboardPaymentBreakdown | Revenue by payment method |

---

## Subscribe / Push

Server-sent event streams for kitchen display and real-time order updates. Clients should reconnect with exponential backoff. The server closes the stream after an idle timeout or restart.

```
rpc Subscribe(SubscribeRequest) returns (stream SubscribeResponse)
rpc Push(PushRequest) returns (PushResponse)
```
