-- +goose Up

-- Admin user (password: admin123)
INSERT INTO users (username, full_name, email, password_hash, role) VALUES
  ('admin', 'Administrator', 'admin@wargapos.local', '$2a$10$fAoTxWUU1TXc6Z/qh.FzDuzgKM9XO2yFzvsff94KQP6nqyWyUPT0K', 'admin');

INSERT INTO categories (name) VALUES
  ('Food'),
  ('Drinks'),
  ('Snacks');

INSERT INTO products (name, sku, category_id, price_cents, is_active) VALUES
  ('Nasi Goreng',    'FOOD-001', (SELECT id FROM categories WHERE name='Food'),   25000, TRUE),
  ('Mie Goreng',     'FOOD-002', (SELECT id FROM categories WHERE name='Food'),   22000, TRUE),
  ('Ayam Bakar',     'FOOD-003', (SELECT id FROM categories WHERE name='Food'),   30000, TRUE),
  ('Es Teh Manis',   'DRK-001',  (SELECT id FROM categories WHERE name='Drinks'), 8000,  TRUE),
  ('Kopi Hitam',     'DRK-002',  (SELECT id FROM categories WHERE name='Drinks'), 10000, TRUE),
  ('Jus Alpukat',    'DRK-003',  (SELECT id FROM categories WHERE name='Drinks'), 18000, TRUE),
  ('Kentang Goreng', 'SNK-001',  (SELECT id FROM categories WHERE name='Snacks'), 15000, TRUE),
  ('Pisang Goreng',  'SNK-002',  (SELECT id FROM categories WHERE name='Snacks'), 12000, TRUE);

INSERT INTO tables (name) VALUES
  ('Meja 1'),
  ('Meja 2'),
  ('Meja 3'),
  ('Meja 4'),
  ('Meja 5');

-- +goose Down

DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM tables;
DELETE FROM categories;
DELETE FROM users;
