-- +goose Up
CREATE TABLE racks (
  id           SERIAL PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name         VARCHAR(300) NOT NULL,
  deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON racks (warehouse_id);

-- +goose Down
DROP TABLE IF EXISTS racks;
