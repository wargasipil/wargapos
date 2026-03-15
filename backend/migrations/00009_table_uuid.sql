-- +goose Up
ALTER TABLE tables ADD COLUMN uuid TEXT NOT NULL DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX ON tables (uuid);

-- +goose Down
ALTER TABLE tables DROP COLUMN IF EXISTS uuid;
