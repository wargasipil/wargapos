-- +goose Up
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status INT NOT NULL DEFAULT 1;

-- Old status=2 (PAID) orders: treat as delivered + paid
UPDATE orders SET status = 5, payment_status = 2 WHERE status = 2;

-- +goose Down
UPDATE orders SET status = 2 WHERE status = 5 AND payment_status = 2;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_status;
