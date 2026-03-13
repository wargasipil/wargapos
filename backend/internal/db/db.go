package db

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"wargapos/backend/internal/config"
)

var DB *gorm.DB

// Connect opens a GORM PostgreSQL connection using the provided config.
func Connect(cfg *config.Config) {
	if cfg.Database.Skip {
		fmt.Println("database: skip=true, skipping connection")
		return
	}

	var err error
	DB, err = gorm.Open(postgres.Open(cfg.Database.URL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("database: failed to connect: %v", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("database: failed to get underlying sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	fmt.Println("database: connection established")
}
