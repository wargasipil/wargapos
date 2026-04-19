# DeviceService

Package: `wargapos.device.v1`

Manages printer connector devices. The connector binary (running locally near the printer) registers itself via the `Connect` streaming RPC and receives print jobs. See also [Printer Connector](../backend/architecture.md#printer-connector).

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `Connect` | — | Connector registers itself; server streams print jobs back |
| `ListDevices` | — | List all connected devices |
| `ListPrinters` | — | List available printers across all devices |
| `Print` | — | Send a print job to a specific printer |

---

## Key Objects

### Device

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Device UUID |
| `name` | string | Device hostname |
| `printer_names` | string[] | Names of attached printers |

### Printer

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | string | ID of the owning device |
| `name` | string | Printer name |

---

## Connect (server-streaming)

```
rpc Connect(ConnectRequest) returns (stream ConnectResponse)
```

Called by the connector binary on startup. The stream stays open while the connector is running. The server pushes print jobs down this stream.

**Request**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Device UUID (stored in `identity.json`) |
| `name` | string | yes | Hostname |
| `printer_names` | string[] | no | Attached printer names |

**Response stream** (`ConnectResponse` — oneof)

| Variant | Description |
|---------|-------------|
| `device_list` | Current list of all connected devices (sent on join/leave) |
| `print_request` | A print job to execute locally |

---

## Print

```
rpc Print(PrintRequest) returns (PrintResponse)
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `printer` | Printer | yes | Target printer (device_id + name) |
| `text` | string | one of | Plain text to print |
| `raw` | bytes | one of | Raw ESC/POS bytes |

**Response:** `{ success: bool, error: string }`

---

## ListDevices / ListPrinters

Both take no request fields.

- `ListDevices` → `{ devices: Device[] }`
- `ListPrinters` → `{ printers: Printer[] }`
