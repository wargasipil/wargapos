-- +goose Up
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS business_type INT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE app_settings DROP COLUMN IF EXISTS business_type;
