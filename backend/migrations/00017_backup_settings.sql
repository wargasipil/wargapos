-- +goose Up
ALTER TABLE app_settings
  ADD COLUMN backup_enabled         boolean     NOT NULL DEFAULT false,
  ADD COLUMN backup_interval_hours  integer     NOT NULL DEFAULT 24,
  ADD COLUMN backup_retention_count integer     NOT NULL DEFAULT 7,
  ADD COLUMN backup_dir             text        NOT NULL DEFAULT './backups',
  ADD COLUMN backup_last_at         timestamptz;

-- +goose Down
ALTER TABLE app_settings
  DROP COLUMN backup_enabled,
  DROP COLUMN backup_interval_hours,
  DROP COLUMN backup_retention_count,
  DROP COLUMN backup_dir,
  DROP COLUMN backup_last_at;
