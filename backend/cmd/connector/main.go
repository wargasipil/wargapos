package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"connectrpc.com/connect"

	devicev1 "wargapos/backend/gen/wargapos/device/v1"
	"wargapos/backend/gen/wargapos/device/v1/devicev1connect"
	"wargapos/backend/internal/config"
)

func main() {
	cfg := config.Load()

	id, err := loadOrCreateIdentity("connector-identity.json")
	if err != nil {
		log.Fatalf("connector: failed to load identity: %v", err)
	}
	fmt.Printf("WargaPOS connector identity: %s (%s)\n", id.Name, id.ID)

	go runDeviceConnect(cfg.Printer.ServerURL, id.ID, id.Name)

	app := InitializeApp(cfg)
	if err := app.ListenAndServe(); err != nil {
		log.Fatalf("connector: %v", err)
	}
}

// runDeviceConnect connects to the main server and holds the stream open.
// Reconnects with exponential backoff on failure.
func runDeviceConnect(serverURL, id, name string) {
	client := devicev1connect.NewDeviceServiceClient(
		&http.Client{},
		serverURL,
	)

	backoff := time.Second
	for {
		if err := connectOnce(client, id, name); err != nil {
			log.Printf("connector: device connect lost (%v), retrying in %s", err, backoff)
		}
		time.Sleep(backoff)
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

func connectOnce(client devicev1connect.DeviceServiceClient, id, name string) error {
	ctx := context.Background()
	stream, err := client.Connect(ctx, connect.NewRequest(&devicev1.ConnectRequest{
		Id:   id,
		Name: name,
	}))
	if err != nil {
		return err
	}
	defer stream.Close()

	for stream.Receive() {
		// first message confirms registration; further messages are not expected
	}
	return stream.Err()
}
