# SettingsService

Package: `wargapos.settings.v1`

Manages application-level settings including Midtrans payment config, manual payment info, printer settings, backup config, and business type.

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `GetSettings` | root, admin | Retrieve current settings |
| `UpdateSettings` | root, admin | Update one or more settings groups |

---

## GetSettings

```
rpc GetSettings(GetSettingsRequest) returns (GetSettingsResponse)
```

No request fields.

**Response**

| Field | Type | Description |
|-------|------|-------------|
| `midtrans` | MidtransSettings | Midtrans keys + environment |
| `midtrans_configured` | bool | True when `server_key` is non-empty |
| `manual_payment` | ManualPaymentSettings | Bank transfer / QRIS details |
| `printer` | PrinterSettings | Receipt printer settings |
| `backup` | BackupSettings | Auto-backup config |
| `business_type` | BusinessType | CAFE or MARKETPLACE |

---

## UpdateSettings

```
rpc UpdateSettings(UpdateSettingsRequest) returns (UpdateSettingsResponse)
```

All groups are optional — only provided groups are updated.

| Field | Type | Description |
|-------|------|-------------|
| `midtrans` | MidtransSettings | |
| `manual_payment` | ManualPaymentSettings | |
| `printer` | PrinterSettings | |
| `backup` | BackupSettings | |
| `business_type` | BusinessType | |

---

## Settings Objects

### MidtransSettings

| Field | Type | Description |
|-------|------|-------------|
| `server_key` | string | Midtrans server key |
| `client_key` | string | Midtrans client key (embedded in frontend) |
| `environment` | string | `"sandbox"` or `"production"` |

### ManualPaymentSettings

| Field | Type | Description |
|-------|------|-------------|
| `bank_name` | string | Bank name |
| `bank_account_number` | string | Account number |
| `bank_account_name` | string | Account holder name |
| `qris_image_url` | string | URL to QRIS image |

### PrinterSettings

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Business name on receipt |
| `description` | string | Tagline |
| `address` | string | Address line 1 |
| `address2` | string | Address line 2 |
| `contact` | string | Phone/contact |
| `footer` | string | Receipt footer message |
| `print_mode` | PrintMode | CONNECTOR (default) or BROWSER |

### BackupSettings

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | bool | Enable automatic backups |
| `interval_hours` | int32 | Hours between backups |
| `retention_count` | int32 | Number of backups to keep |
| `backup_dir` | string | Directory to store backups |
| `last_backup_at` | Timestamp | Time of last successful backup |

### BusinessType

| Value | Description |
|-------|-------------|
| `BUSINESS_TYPE_CAFE` | Cafe/restaurant mode |
| `BUSINESS_TYPE_MARKETPLACE` | Marketplace mode |
