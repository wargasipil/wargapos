-- +goose Up
ALTER TABLE stock_logs ADD COLUMN cost_version_id BIGINT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE stock_logs DROP COLUMN IF EXISTS cost_version_id;
