-- +goose Up
CREATE TABLE warehouses (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(300) NOT NULL,
  deleted    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS warehouses;
