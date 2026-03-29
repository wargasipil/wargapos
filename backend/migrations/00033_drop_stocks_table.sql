-- +goose Up
ALTER TABLE stock_logs DROP COLUMN IF EXISTS stock_id;
ALTER TABLE stock_logs DROP COLUMN IF EXISTS cost_version_id;
DROP TABLE IF EXISTS stocks;

-- +goose Down
CREATE TABLE stocks (
  id             BIGSERIAL PRIMARY KEY,
  sku_id         INT NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  transaction_id BIGINT NOT NULL REFERENCES stock_transactions(id) ON DELETE RESTRICT,
  stock_initiate INT NOT NULL,
  left_stock     INT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON stocks (sku_id);
CREATE INDEX ON stocks (transaction_id);
ALTER TABLE stock_logs ADD COLUMN stock_id BIGINT;
ALTER TABLE stock_logs ADD COLUMN cost_version_id BIGINT;
