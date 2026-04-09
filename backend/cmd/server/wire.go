//go:build wireinject

package main

import (
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/database"
	"wargapos/backend/internal/service/auth_service"
	"wargapos/backend/internal/service/backup_service"
	"wargapos/backend/internal/service/device_service"
	"wargapos/backend/internal/service/event_service"
	"wargapos/backend/internal/service/ingredient_service"
	"wargapos/backend/internal/service/marketplace_order_service"
	"wargapos/backend/internal/service/marketplace_service"
	"wargapos/backend/internal/service/notification_service"
	"wargapos/backend/internal/service/product_service"
	"wargapos/backend/internal/service/settings_service"
	"wargapos/backend/internal/service/stock_service"
	"wargapos/backend/internal/service/table_service"
	"wargapos/backend/internal/service/transaction_service"
	"wargapos/backend/internal/service/user_service"

	"github.com/google/wire"
)

func InitializeApp(cfg *config.Config) (App, error) {
	wire.Build(
		database.NewDB,
		config.ProvideAuthConfig,
		config.ProvideMidtransConfig,
		NewDefaultServiceClientOption,
		NewEventServiceClient,
		NewStockServiceClient,
		event_service.NewEventService,
		auth_service.NewAuthService,
		user_service.NewUserService,
		product_service.NewProductService,
		notification_service.NewNotificationService,
		transaction_service.NewTransactionService,
		transaction_service.NewTransactionRunner,
		table_service.NewTableService,
		settings_service.NewSettingsService,
		stock_service.NewStockService,
		ingredient_service.NewIngredientService,
		marketplace_service.NewMarketplaceService,
		marketplace_order_service.NewMarketplaceOrderService,
		device_service.NewDeviceService,
		backup_service.NewBackupService,
		NewPartitionRunner,
		NewPartitionRunnerFunc,
		NewWebRunnerFunc,
		NewApp,
	)
	return nil, nil
}
