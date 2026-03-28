-- +goose Up
ALTER TABLE skus ADD COLUMN last_stock_in TIMESTAMPTZ;

-- +goose Down
ALTER TABLE skus DROP COLUMN last_stock_in;
