-- +goose Up
ALTER TABLE skus ADD COLUMN stock_qty BIGINT NOT NULL DEFAULT 0;

CREATE TABLE stock_transactions (
  id               BIGSERIAL PRIMARY KEY,
  transaction_type SMALLINT NOT NULL,
  note             VARCHAR(500) NOT NULL DEFAULT '',
  cancelled        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_transaction_items (
  id             BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES stock_transactions(id) ON DELETE CASCADE,
  sku_id         INT NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  quantity       BIGINT NOT NULL,
  price          BIGINT NOT NULL DEFAULT 0,
  rack_id        INT REFERENCES racks(id) ON DELETE SET NULL
);
CREATE INDEX ON stock_transaction_items (transaction_id);
CREATE INDEX ON stock_transaction_items (sku_id);

-- +goose Down
DROP TABLE IF EXISTS stock_transaction_items;
DROP TABLE IF EXISTS stock_transactions;
ALTER TABLE skus DROP COLUMN IF EXISTS stock_qty;
