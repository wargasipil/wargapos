# TableService

Package: `wargapos.table.v1`

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `CreateTable` | root, admin | Create a dine-in table |
| `UpdateTable` | root, admin | Rename a table |
| `DeleteTable` | root, admin | Delete a table |
| `ListTables` | public | List all tables |
| `GetTable` | public | Get table by ID or UUID |

---

### Table object

| Field | Type | Description |
|-------|------|-------------|
| `id` | int64 | Table ID |
| `name` | string | Display name (e.g. "Table 1") |
| `uuid` | string | Unique UUID used in guest ordering URL |

The `uuid` is embedded in the QR code URL: `/menu?table=<uuid>`. When a guest scans the QR code they see the menu pre-associated with that table.

---

### CreateTable

```
rpc CreateTable(CreateTableRequest) returns (CreateTableResponse)
```

**Request:** `{ name: string }` (min 1 char)
**Response:** `{ table: Table }`

---

### UpdateTable

```
rpc UpdateTable(UpdateTableRequest) returns (UpdateTableResponse)
```

**Request:** `{ id: int64, name: string }` (both required)
**Response:** `{ table: Table }`

---

### DeleteTable

```
rpc DeleteTable(DeleteTableRequest) returns (DeleteTableResponse)
```

**Request:** `{ id: int64 }`

---

### ListTables

```
rpc ListTables(ListTablesRequest) returns (ListTablesResponse)
```

No request fields. **Response:** `{ tables: Table[] }`

---

### GetTable

```
rpc GetTable(GetTableRequest) returns (GetTableResponse)
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | int64 | Lookup by numeric ID |
| `uuid` | string | Lookup by UUID (guest QR code flow) |

**Response:** `{ table: Table }`
