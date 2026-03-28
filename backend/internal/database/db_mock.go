package database

import (
	"log"
	"testing"
	"wargapos/backend/internal/config"
	"wargapos/backend/pkgs/wargatest"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewTestDatabase(db *gorm.DB) wargatest.InititateFunc {
	cfg := config.LoadForUnitTest()

	return func(t *testing.T) func() {
		tempDb, err := gorm.Open(postgres.Open(cfg.Database.URL))
		if err != nil {
			log.Fatalf("database: failed to connect: %v", err)
		}

		tx := tempDb.Begin()
		*db = *tx
		return func() {
			err := tx.Rollback().Error
			if err != nil {
				t.Error(err)
			}
		}
	}
}
