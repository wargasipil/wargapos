-- +goose Up

-- status: TEXT → SMALLINT (proto OrderStatus values: 1=pending, 2=paid, 3=cancelled, 4=ready, 5=delivered)
ALTER TABLE orders DROP COLUMN status;
ALTER TABLE orders ADD COLUMN status SMALLINT NOT NULL DEFAULT 0;

-- payment_method: TEXT → SMALLINT (proto PaymentMethod: 1=cash, 2=midtrans, 3=manual_qris, 4=manual_transfer)
ALTER TABLE orders DROP COLUMN payment_method;
ALTER TABLE orders ADD COLUMN payment_method SMALLINT;

-- Indexes for common filter queries
CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_order_from ON orders (order_from);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

-- +goose Down

DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_orders_order_from;
DROP INDEX IF EXISTS idx_orders_status;
