-- +goose Up
ALTER TABLE marketplace_orders
    ADD COLUMN warehouse_id INT NOT NULL DEFAULT 0,
    ADD COLUMN customer_id BIGINT NOT NULL DEFAULT 0;
CREATE INDEX ON marketplace_orders (customer_id);

-- +goose Down
ALTER TABLE marketplace_orders
    DROP COLUMN IF EXISTS warehouse_id,
    DROP COLUMN IF EXISTS customer_id;
