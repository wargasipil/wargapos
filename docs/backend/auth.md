# Authentication & Authorization

## Overview

WargaPOS uses JWT-based authentication enforced via Connect interceptors. Every RPC request passes through two interceptors: one that validates the token and one that checks role permissions.

## JWT Tokens

- **Algorithm:** HMAC-SHA256
- **Claims:** `identity_id` (user ID), `role`, standard JWT claims (`exp`, `iat`)
- **Header:** `Authorization: Bearer <token>`
- **Expiry:** Configurable via `auth.token_expire_hours` (default: 24 hours)
- **Refresh:** Clients should call `RefreshToken` when the token is within 5 minutes of expiry

The frontend (`frontend/src/client.ts`) automatically:
1. Attaches the JWT to every request via `authInterceptor`
2. Proactively refreshes tokens within 5 minutes of expiry via `refreshInterceptor`
3. Redirects to `/login` on any `Unauthenticated` response

## Token Interceptor (`backend/internal/auth/`)

Applied to all Connect handlers. For each request:

1. Reads `Authorization` header
2. If present, parses and validates the JWT using `jwt_secret`
3. Stores the claims in the request context via `ContextSetClaims()`
4. If the token is missing or invalid and the RPC requires auth, returns `CodeUnauthenticated`

## Role Interceptor

Reads the `request_policy` proto option from each RPC's request message and enforces it.

```protobuf
message CreateShopRequest {
  option (wargapos.rolebased.v1.request_policy) = {
    roles: [ROLE_ROOT, ROLE_ADMIN]
  };
  // ...
}
```

Policy options:

| Policy | Behavior |
|--------|---------|
| No policy set | Public — no auth required |
| `allow_authenticated: true` | Any valid token accepted |
| `roles: [...]` | Token must carry one of the listed roles |

On failure, returns `CodePermissionDenied`.

## Roles

| Role | Constant | Description |
|------|----------|-------------|
| Root | `ROLE_ROOT` | Superuser — unrestricted access |
| Admin | `ROLE_ADMIN` | Full operational access |
| Warehouse Admin | `ROLE_WAREHOUSE_ADMIN` | Stock + marketplace operations |
| Accountant | `ROLE_ACCOUNTANT` | Read-only: orders, transactions, stock |
| Cashier | `ROLE_CASHIER` | POS, orders, tables |

## Frontend Role Helpers (`frontend/src/lib/roles.ts`)

```ts
isRootOrAdmin(role)       // root or admin
canManageProducts(role)   // root, admin, warehouse_admin
canViewStock(role)        // root, admin, warehouse_admin, accountant
canManageMarketplace(role) // root, admin, warehouse_admin
canViewOrders(role)       // root, admin, warehouse_admin, accountant
canViewTransactions(role) // root, admin, accountant
```

These guard both route `beforeLoad` hooks and UI element visibility.

## First-Run Setup

On a fresh installation with no users, the endpoint `GET /setup-needed` returns `{"needed": true}`. The frontend redirects all `/login` visits to `/setup`. After the root user is created via `POST /setup`, the endpoint permanently returns `{"needed": false}`.
