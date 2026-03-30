-- +goose Up
ALTER TABLE marketplace_product_stocks ADD COLUMN sku_id INT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE marketplace_product_stocks DROP COLUMN IF EXISTS sku_id;
