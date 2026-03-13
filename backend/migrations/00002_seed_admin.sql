-- +goose Up
-- Default admin user: username=admin password=admin123
-- Hash generated with bcrypt cost 10
INSERT INTO users (id, username, full_name, email, password_hash, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin',
    'Administrator',
    'admin@wargapos.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin',
    true
)
ON CONFLICT (username) DO NOTHING;

-- +goose Down
DELETE FROM users WHERE username = 'admin';
