-- +goose Up
ALTER TABLE products ADD COLUMN stock_qty INT NOT NULL DEFAULT 0;

CREATE TABLE stock_movements (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta       INT NOT NULL,
  reason      TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON stock_movements (product_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS stock_movements;
ALTER TABLE products DROP COLUMN IF EXISTS stock_qty;
