# Quick Start

## Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 14+
- [Buf CLI](https://buf.build/docs/installation) (for proto codegen)
- [Wire](https://github.com/google/wire) (`go install github.com/google/wire/cmd/wire@latest`)

## 1. Clone the repository

```bash
git clone <repo-url>
cd wargapos
```

## 2. Configure the backend

Copy the example config and edit it:

```bash
cp backend/config.example.yaml backend/config.yaml
```

Minimum required fields:

```yaml
database:
  url: postgres://user:password@localhost:5432/wargapos

auth:
  jwt_secret: change-me-in-production
```

See [Configuration](backend/configuration.md) for the full reference.

## 3. Run database migrations

```bash
make migrate-up
```

## 4. First-run setup

On first launch, navigate to `http://localhost:5173/setup` to create the initial root user.

## 5. Start the backend

```bash
make backend-run
```

The backend listens on `:8080`.

## 6. Start the frontend (development)

```bash
make frontend-dev
```

Vite starts on `:5173` and proxies all `/wargapos` requests to `:8080`.

## 7. (Optional) Start the printer connector

If you have an ESC/POS printer:

```bash
PRINTER_ADDRESS=192.168.1.100:9100 make connector-run
```

The connector listens on `:8081`.

---

## Environment Variables

All config values can be overridden via environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `MIDTRANS_SERVER_KEY` | Midtrans server key |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key |
| `PRINTER_ADDRESS` | ESC/POS printer IP:port |

---

## User Roles

| Role | Access Level |
|------|-------------|
| `root` | Full access to everything |
| `admin` | Full access except root-only operations |
| `warehouse_admin` | Stock, marketplace, and inventory operations |
| `accountant` | Read-only access to orders, transactions, stock |
| `cashier` | POS, orders, tables |
