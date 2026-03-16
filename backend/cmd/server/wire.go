//go:build wireinject

package main

import (
	"github.com/google/wire"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/db"
	"wargapos/backend/internal/service/auth_service"
	"wargapos/backend/internal/service/device_service"
	"wargapos/backend/internal/service/product_service"
	"wargapos/backend/internal/service/settings_service"
	"wargapos/backend/internal/service/stock_service"
	"wargapos/backend/internal/service/table_service"
	"wargapos/backend/internal/service/transaction_service"
	"wargapos/backend/internal/service/user_service"
)

func InitializeApp(cfg *config.Config) (*App, error) {
	wire.Build(
		db.NewDB,
		config.ProvideAuthConfig,
		config.ProvideMidtransConfig,
		auth_service.NewAuthService,
		user_service.NewUserService,
		product_service.NewProductService,
		transaction_service.NewTransactionService,
		table_service.NewTableService,
		settings_service.NewSettingsService,
		stock_service.NewStockService,
		device_service.NewDeviceService,
		NewApp,
	)
	return nil, nil
}
