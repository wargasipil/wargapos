-- +goose Up
ALTER TABLE skus ADD COLUMN IF NOT EXISTS product_type INT NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE skus DROP COLUMN IF EXISTS product_type;
