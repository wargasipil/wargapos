-- +goose Up
ALTER TABLE sku_rack_placements RENAME TO rack_placements;

-- +goose Down
ALTER TABLE rack_placements RENAME TO sku_rack_placements;
