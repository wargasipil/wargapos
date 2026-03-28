-- +goose Up
ALTER TABLE price_versions ALTER COLUMN price TYPE DOUBLE PRECISION;

-- +goose Down
ALTER TABLE price_versions ALTER COLUMN price TYPE BIGINT USING price::bigint;
