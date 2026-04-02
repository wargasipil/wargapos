-- +goose Up
UPDATE skus SET product_type = 3 WHERE code LIKE 'MP-%' AND product_type = 0;

-- +goose Down
UPDATE skus SET product_type = 0 WHERE code LIKE 'MP-%';
