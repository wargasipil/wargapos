-- +goose Up
CREATE TABLE placement_logs (
  id             BIGSERIAL PRIMARY KEY,
  sku_id         INT NOT NULL,
  from_rack_id   INT NOT NULL DEFAULT 0,
  to_rack_id     INT NOT NULL DEFAULT 0,
  placement_type SMALLINT NOT NULL DEFAULT 0,
  transaction_id BIGINT NOT NULL DEFAULT 0,
  actor_id       INT NOT NULL DEFAULT 0,
  change         INT NOT NULL DEFAULT 0,
  note           TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_placement_logs_to_rack ON placement_logs (to_rack_id);
CREATE INDEX idx_placement_logs_from_rack ON placement_logs (from_rack_id);

-- +goose Down
DROP TABLE IF EXISTS placement_logs;
