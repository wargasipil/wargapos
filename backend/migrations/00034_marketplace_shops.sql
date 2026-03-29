-- +goose Up
CREATE TABLE marketplace_shops (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    type INT NOT NULL DEFAULT 0,
    username VARCHAR NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS marketplace_shops;
