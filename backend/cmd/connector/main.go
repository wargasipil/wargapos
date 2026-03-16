package main

import (
	"fmt"
	"log"

	"wargapos/backend/internal/config"
)

func main() {
	cfg := config.Load()

	id, err := loadOrCreateIdentity("connector-identity.json")
	if err != nil {
		log.Fatalf("connector: failed to load identity: %v", err)
	}
	fmt.Printf("WargaPOS connector identity: %s (%s)\n", id.Name, id.ID)
	app := InitializeApp(cfg)
	go app.StartStream(cfg.Printer.ServerURL, id.ID, id.Name)

	if err := app.ListenAndServe(); err != nil {
		log.Fatalf("connector: %v", err)
	}
}
