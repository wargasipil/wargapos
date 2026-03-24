-- +goose Up
ALTER TABLE app_settings ADD COLUMN printer_mode integer NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE app_settings DROP COLUMN printer_mode;
