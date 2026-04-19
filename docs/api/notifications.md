# NotificationService

Package: `wargapos.notification.v1`

Provides in-app notifications for order lifecycle events (placed, prepared, delivered, paid, cancelled).

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `ListNotifications` | authenticated | Paginated notification list |
| `MarkAllRead` | authenticated | Mark all notifications as read |

---

## Notification object

| Field | Type | Description |
|-------|------|-------------|
| `id` | int64 | Notification ID |
| `type` | NotificationType | Event type |
| `title` | string | Short heading |
| `body` | string | Full message |
| `order_id` | int64 | Related order ID |
| `created_at` | Timestamp | When the event occurred |
| `is_read` | bool | Whether the user has read it |

## NotificationType

| Value | Description |
|-------|-------------|
| `ORDER_PLACED` | New order created |
| `ORDER_PREPARED` | Order marked ready |
| `ORDER_DELIVERED` | Order delivered |
| `ORDER_PAID` | Payment confirmed |
| `ORDER_CANCELLED` | Order cancelled |

---

## ListNotifications

```
rpc ListNotifications(ListNotificationsRequest) returns (ListNotificationsResponse)
```

| Field | Type | Description |
|-------|------|-------------|
| `page` | int32 | 1-based page |
| `page_size` | int32 | Per page |

**Response:** `{ notifications: Notification[], total: int32 }`

---

## MarkAllRead

```
rpc MarkAllRead(MarkAllReadRequest) returns (MarkAllReadResponse)
```

No fields. Marks all notifications for the current user as read.
