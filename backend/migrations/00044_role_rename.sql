-- +goose Up
UPDATE users SET role = 'root'            WHERE role = 'admin';
UPDATE users SET role = 'warehouse_admin' WHERE role = 'manager';
-- cashier stays cashier

-- +goose Down
UPDATE users SET role = 'admin'   WHERE role = 'root';
UPDATE users SET role = 'manager' WHERE role = 'warehouse_admin';
