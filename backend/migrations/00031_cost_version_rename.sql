-- +goose Up
ALTER TABLE price_versions RENAME TO cost_versions;
ALTER TABLE cost_versions RENAME COLUMN price TO unit_cost;
ALTER TABLE skus ADD COLUMN costing_type INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_logs RENAME COLUMN price_version_id TO cost_version_id;

-- +goose Down
ALTER TABLE stock_logs RENAME COLUMN cost_version_id TO price_version_id;
ALTER TABLE skus DROP COLUMN costing_type;
ALTER TABLE cost_versions RENAME COLUMN unit_cost TO price;
ALTER TABLE cost_versions RENAME TO price_versions;
