-- +goose Up
CREATE TABLE skus (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(255) NOT NULL UNIQUE,
  product_id    INT NOT NULL,
  branch_id     INT NOT NULL,
  warehouse_id  INT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  average_price BIGINT NOT NULL DEFAULT 0,
  deleted       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON skus (product_id);
CREATE INDEX ON skus (warehouse_id);

-- +goose Down
DROP TABLE IF EXISTS skus;
