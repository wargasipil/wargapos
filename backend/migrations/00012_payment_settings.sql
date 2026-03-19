-- +goose Up
ALTER TABLE app_settings
  ADD COLUMN bank_name           TEXT NOT NULL DEFAULT '',
  ADD COLUMN bank_account_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN bank_account_name   TEXT NOT NULL DEFAULT '',
  ADD COLUMN qris_image_url      TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE app_settings
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_account_name,
  DROP COLUMN IF EXISTS qris_image_url;
