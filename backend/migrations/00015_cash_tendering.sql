-- +goose Up
ALTER TABLE orders ADD COLUMN cash_tendered_cents BIGINT;
ALTER TABLE orders ADD COLUMN change_cents BIGINT;

-- +goose Down
ALTER TABLE orders DROP COLUMN cash_tendered_cents;
ALTER TABLE orders DROP COLUMN change_cents;
