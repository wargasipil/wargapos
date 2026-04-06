-- +goose Up
ALTER TABLE marketplace_orders
  ADD COLUMN note         TEXT         NOT NULL DEFAULT '',
  ADD COLUMN receipt      VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN receipt_file VARCHAR(500) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE marketplace_orders
  DROP COLUMN note,
  DROP COLUMN receipt,
  DROP COLUMN receipt_file;
