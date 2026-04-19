# BackupService

Package: `wargapos.backup.v1`

Manages PostgreSQL database backups. Backups are stored as `.sql` dump files on the server.

See also: plain HTTP endpoints for download and upload — `GET /backup/download-existing` and `POST /backup/restore-upload`.

## RPCs

| Method | Auth | Description |
|--------|------|-------------|
| `RunBackup` | root, admin | Trigger an immediate backup (streaming) |
| `ListBackup` | root, admin | List available backup files |
| `DeleteBackup` | root, admin | Delete a backup file |
| `RestoreBackup` | root, admin | Restore from a backup file (streaming) |

---

## RunBackup (server-streaming)

```
rpc RunBackup(RunBackupRequest) returns (stream RunBackupResponse)
```

No request fields. Streams progress messages while the dump runs, then emits `filepath` on completion.

**Response stream** (`RunBackupResponse` — oneof)

| Variant | Type | Description |
|---------|------|-------------|
| `filepath` | string | Path of completed backup file |
| `msg` | string | Progress/status message |

---

## ListBackup

```
rpc ListBackup(ListBackupRequest) returns (ListBackupResponse)
```

No request fields. **Response:** `{ fnames: string[] }` — list of backup file names.

---

## DeleteBackup

```
rpc DeleteBackup(DeleteBackupRequest) returns (DeleteBackupResponse)
```

**Request:** `{ fname: string }` — file name to delete.

---

## RestoreBackup (server-streaming)

```
rpc RestoreBackup(RestoreBackupRequest) returns (stream RestoreBackupResponse)
```

**Request:** `{ fname: string }` — file name to restore from.

**Response stream:** `{ msg: string }` — progress messages during restore.

> **Warning:** Restore replaces all current data. The server restarts after a successful restore.

---

## Auto-backup

Automatic scheduled backups are configured via [SettingsService](settings.md) (`BackupSettings`):
- `enabled` — turn on/off
- `interval_hours` — how often
- `retention_count` — how many files to keep
- `backup_dir` — where to store files
