package database

import (
	"database/sql"

	"github.com/pressly/goose/v3"

	"wargapos/backend/migrations"
)

// RunMigrations applies all pending goose migrations.
func RunMigrations(sqlDB *sql.DB) error {
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(sqlDB, ".")
}
