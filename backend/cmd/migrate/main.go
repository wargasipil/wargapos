package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"wargapos/backend/internal/config"
	"wargapos/backend/migrations"
)

func main() {
	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	cfg := config.Load()

	sqlDB, err := sql.Open("pgx", cfg.Database.URL)
	if err != nil {
		log.Fatalf("migrate: failed to open db: %v", err)
	}
	defer sqlDB.Close()

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatal(err)
	}

	if err := goose.Run(command, sqlDB, "."); err != nil {
		log.Fatalf("goose %s: %v", command, err)
	}
	fmt.Printf("migration '%s' completed\n", command)
}
