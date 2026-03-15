-- +goose Up
CREATE TABLE IF NOT EXISTS app_settings (
  id                   SERIAL PRIMARY KEY,
  midtrans_server_key  TEXT NOT NULL DEFAULT '',
  midtrans_client_key  TEXT NOT NULL DEFAULT '',
  midtrans_environment TEXT NOT NULL DEFAULT 'sandbox',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure exactly one row always exists
INSERT INTO app_settings (midtrans_server_key, midtrans_client_key, midtrans_environment)
VALUES ('', '', 'sandbox')
ON CONFLICT DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS app_settings;
