-- +goose Up
ALTER TABLE app_settings
  ADD COLUMN printer_title       TEXT NOT NULL DEFAULT '',
  ADD COLUMN printer_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN printer_address     TEXT NOT NULL DEFAULT '',
  ADD COLUMN printer_address2    TEXT NOT NULL DEFAULT '',
  ADD COLUMN printer_contact     TEXT NOT NULL DEFAULT '',
  ADD COLUMN printer_footer      TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE app_settings
  DROP COLUMN printer_title,
  DROP COLUMN printer_description,
  DROP COLUMN printer_address,
  DROP COLUMN printer_address2,
  DROP COLUMN printer_contact,
  DROP COLUMN printer_footer;
