-- +goose Up
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_from smallint NOT NULL DEFAULT 0;
