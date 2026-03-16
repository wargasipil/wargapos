//go:build wireinject

package main

import (
	"github.com/google/wire"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/service/connector_service"
)

func InitializeApp(cfg *config.Config) *App {
	wire.Build(
		config.ProvideConnectorConfig,
		connector_service.NewConnectorService,
		NewApp,
	)
	return nil
}
