-- +goose Up
ALTER TABLE stock_transaction_items DROP COLUMN IF EXISTS rack_id;

-- +goose Down
ALTER TABLE stock_transaction_items ADD COLUMN rack_id INT REFERENCES racks(id) ON DELETE SET NULL;
