package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"wargapos/backend/internal/config"
)

var DB *gorm.DB

// NewDB is a Wire provider that opens a GORM connection, runs migrations, and returns *gorm.DB.
func NewDB(cfg *config.Config) *gorm.DB {
	Connect(cfg)
	if DB == nil {
		return nil
	}
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("database: failed to get sql.DB for migrations: %v", err)
	}
	if err := RunMigrations(sqlDB); err != nil {
		log.Fatalf("database: migrations failed: %v", err)
	}
	return DB
}

// Connect opens a GORM PostgreSQL connection using the provided config.
func Connect(cfg *config.Config) {
	if cfg.Database.Skip {
		fmt.Println("database: skip=true, skipping connection")
		return
	}

	var err error
	DB, err = gorm.Open(postgres.Open(cfg.Database.URL))
	if err != nil {
		log.Fatalf("database: failed to connect: %v", err)
	}

	DB = DB.Debug()

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("database: failed to get underlying sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	fmt.Println("database: connection established")
}
