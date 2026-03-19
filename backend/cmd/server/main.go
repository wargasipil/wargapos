package main

import (
	"context"
	"embed"
	"os"

	"wargapos/backend/internal/config"

	"github.com/urfave/cli/v3"
)

//go:embed static
var staticFiles embed.FS

func main() {
	var err error
	var app *cli.Command

	cfg := config.Load()
	app, err = InitializeApp(cfg)
	if err != nil {
		panic(err)
	}

	err = app.Run(context.Background(), os.Args)
	if err != nil {
		panic(err)
	}
}
