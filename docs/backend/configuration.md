# Configuration

The backend reads `backend/config.yaml` on startup. All values can be overridden with environment variables.

## Full config.yaml Reference

```yaml
server:
  protocol: https          # http or https (affects cookie/redirect behaviour)
  host: 0.0.0.0            # Listen address
  port: "8080"             # Listen port
  upload_dir: ./uploads    # Directory for uploaded files

database:
  url: postgres://user:password@localhost:5432/wargapos
  skip: false              # Set true to skip DB connection (dev only)

auth:
  jwt_secret: change-me    # HMAC-SHA256 signing key — change in production
  token_expire_hours: 24   # Access token lifetime

midtrans:
  server_key: ""           # Midtrans server key
  client_key: ""           # Midtrans client key (embedded in frontend)
  environment: sandbox     # sandbox or production

printer:
  host: localhost          # Connector host
  port: "8081"             # Connector port
  server_url: ""           # Public URL the connector uses to reach the server
```

## Environment Variable Overrides

| Env Var | Config Path | Notes |
|---------|------------|-------|
| `DATABASE_URL` | `database.url` | Full Postgres connection string |
| `DB_SKIP` | `database.skip` | Set `1` to skip DB connection |
| `JWT_SECRET` | `auth.jwt_secret` | **Required in production** |
| `MIDTRANS_SERVER_KEY` | `midtrans.server_key` | |
| `MIDTRANS_CLIENT_KEY` | `midtrans.client_key` | |
| `PRINTER_ADDRESS` | — | Used by the connector binary only |

## Database Migrations

Migrations are managed by [Goose](https://github.com/pressly/goose) and embedded in the binary.

```bash
make migrate-up       # Apply all pending migrations
make migrate-down     # Roll back the last migration
make migrate-status   # Show applied/pending migrations
make migrate-reset    # Roll back all migrations (destructive!)
```

Migration files live in `backend/migrations/` and are named `00NNN_description.sql`.

### Migration Policy

When a task requires a schema change, always decide whether to:

- **Append** to the last migration — only if it hasn't been applied to any shared/production DB yet
- **Create a new file** — for any standalone or independently deployable schema change, named `00NNN_short_description.sql` with the next sequential number
