-- +goose Up
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_cashier_id_fkey;
ALTER TABLE users ALTER COLUMN id TYPE integer USING id::integer;
ALTER TABLE orders ALTER COLUMN cashier_id TYPE integer USING cashier_id::integer;
ALTER TABLE stock_movements ALTER COLUMN created_by TYPE integer USING created_by::integer;
ALTER TABLE orders ADD CONSTRAINT orders_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES users(id);

-- +goose Down
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_cashier_id_fkey;
ALTER TABLE users ALTER COLUMN id TYPE bigint USING id::bigint;
ALTER TABLE orders ALTER COLUMN cashier_id TYPE bigint USING cashier_id::bigint;
ALTER TABLE stock_movements ALTER COLUMN created_by TYPE bigint USING created_by::bigint;
ALTER TABLE orders ADD CONSTRAINT orders_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES users(id);
