-- +goose Up
CREATE TABLE materials (
  id         SERIAL PRIMARY KEY,
  branch_id  INT,
  code       VARCHAR(100) NOT NULL UNIQUE,
  name       VARCHAR(300) NOT NULL,
  qty_type   SMALLINT NOT NULL DEFAULT 0,
  qty        BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipes (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id)
);

CREATE TABLE recipe_items (
  id          SERIAL PRIMARY KEY,
  recipe_id   INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  material_id INT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  qty         BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON recipe_items (recipe_id);

-- +goose Down
DROP TABLE IF EXISTS recipe_items;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS materials;
