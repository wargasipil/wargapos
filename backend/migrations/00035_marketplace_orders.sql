-- +goose Up
CREATE TABLE marketplace_orders (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES marketplace_shops(id),
    customer_name VARCHAR NOT NULL DEFAULT '',
    phone_number VARCHAR NOT NULL DEFAULT '',
    total_cents BIGINT NOT NULL DEFAULT 0,
    status INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES marketplace_orders(id),
    item_name VARCHAR NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_cents BIGINT NOT NULL DEFAULT 0,
    subtotal_cents BIGINT NOT NULL DEFAULT 0
);

-- +goose Down
DROP TABLE IF EXISTS marketplace_order_items;
DROP TABLE IF EXISTS marketplace_orders;
