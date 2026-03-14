-- +goose Up
ALTER TABLE orders      ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders      ADD COLUMN IF NOT EXISTS phone_number  TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes         TEXT;

-- +goose Down
ALTER TABLE orders      DROP COLUMN IF EXISTS customer_name;
ALTER TABLE orders      DROP COLUMN IF EXISTS phone_number;
ALTER TABLE order_items DROP COLUMN IF EXISTS notes;
