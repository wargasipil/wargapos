-- +goose Up
CREATE TABLE notifications (
    id         BIGSERIAL   PRIMARY KEY,
    type       SMALLINT    NOT NULL,
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL DEFAULT '',
    order_id   BIGINT,
    is_read    BOOL        NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX idx_notifications_is_read    ON notifications (is_read) WHERE is_read = false;

-- +goose Down
DROP TABLE IF EXISTS notifications;
