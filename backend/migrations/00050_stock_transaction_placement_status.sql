-- +goose Up
ALTER TABLE stock_transactions ADD COLUMN placement_status SMALLINT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE stock_transactions DROP COLUMN IF EXISTS placement_status;
