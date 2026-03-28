-- +goose Up
CREATE TABLE sku_rack_placements (
  id         BIGSERIAL PRIMARY KEY,
  sku_id     INT NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  rack_id    INT NOT NULL REFERENCES racks(id) ON DELETE RESTRICT,
  left_stock INT NOT NULL DEFAULT 0,
  UNIQUE (sku_id, rack_id)
);
CREATE INDEX ON sku_rack_placements (sku_id);

-- +goose Down
DROP TABLE IF EXISTS sku_rack_placements;
