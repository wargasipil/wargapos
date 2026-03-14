-- +goose Up
ALTER TABLE products ADD COLUMN IF NOT EXISTS cogs_cents bigint NOT NULL DEFAULT 0;
