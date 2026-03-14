-- +goose Up
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- +goose Down
ALTER TABLE products DROP COLUMN IF EXISTS image_url;
ALTER TABLE users    DROP COLUMN IF EXISTS image_url;
