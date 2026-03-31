-- +goose Up
ALTER TABLE marketplace_orders
    ADD COLUMN address_id BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN shipping_label VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN shipping_address TEXT NOT NULL DEFAULT '',
    ADD COLUMN shipping_city VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN shipping_province VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN shipping_postal_code VARCHAR(20) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE marketplace_orders
    DROP COLUMN IF EXISTS address_id,
    DROP COLUMN IF EXISTS shipping_label,
    DROP COLUMN IF EXISTS shipping_address,
    DROP COLUMN IF EXISTS shipping_city,
    DROP COLUMN IF EXISTS shipping_province,
    DROP COLUMN IF EXISTS shipping_postal_code;
