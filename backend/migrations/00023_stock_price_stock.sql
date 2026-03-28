-- +goose Up
CREATE TABLE price_versions (
  id             BIGSERIAL PRIMARY KEY,
  sku_id         INT NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  transaction_id BIGINT NOT NULL REFERENCES stock_transactions(id) ON DELETE RESTRICT,
  price          BIGINT NOT NULL,
  stock_initiate INT NOT NULL,
  left_stock     INT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON price_versions (sku_id);
CREATE INDEX ON price_versions (transaction_id);

CREATE TABLE stocks (
  id             BIGSERIAL PRIMARY KEY,
  sku_id         INT NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  transaction_id BIGINT NOT NULL REFERENCES stock_transactions(id) ON DELETE RESTRICT,
  stock_initiate INT NOT NULL,
  left_stock     INT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON stocks (sku_id);
CREATE INDEX ON stocks (transaction_id);

CREATE TABLE stock_logs (
  id               BIGSERIAL PRIMARY KEY,
  sku_id           INT NOT NULL,
  transaction_id   BIGINT NOT NULL,
  change           INT NOT NULL,
  log_type         SMALLINT NOT NULL,
  actor_id         INT NOT NULL DEFAULT 0,
  price_version_id BIGINT NOT NULL DEFAULT 0,
  stock_id         BIGINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON stock_logs (sku_id);
CREATE INDEX ON stock_logs (transaction_id);

-- +goose Down
DROP TABLE IF EXISTS stock_logs;
DROP TABLE IF EXISTS stocks;
DROP TABLE IF EXISTS price_versions;
