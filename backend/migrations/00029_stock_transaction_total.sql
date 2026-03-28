-- +goose Up
ALTER TABLE stock_transactions ADD COLUMN total DOUBLE PRECISION NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE stock_transactions DROP COLUMN total;
