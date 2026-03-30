-- +goose Up
CREATE TABLE marketplace_product_stocks (
    id                     BIGSERIAL PRIMARY KEY,
    marketplace_product_id BIGINT NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
    warehouse_id           INT NOT NULL,
    left_stock             INT NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (marketplace_product_id, warehouse_id)
);
CREATE INDEX ON marketplace_product_stocks (marketplace_product_id);

-- +goose Down
DROP TABLE IF EXISTS marketplace_product_stocks;
