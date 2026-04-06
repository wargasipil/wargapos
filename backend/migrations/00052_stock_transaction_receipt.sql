-- +goose Up
ALTER TABLE stock_transactions
  ADD COLUMN receipt VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN receipt_file VARCHAR(500) NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE stock_transactions
  DROP COLUMN receipt,
  DROP COLUMN receipt_file;
