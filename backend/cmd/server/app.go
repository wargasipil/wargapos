package main

import (
	"net/http"

	"connectrpc.com/connect"
	"connectrpc.com/grpcreflect"
	"connectrpc.com/validate"
	"gorm.io/gorm"

	"wargapos/backend/gen/wargapos/auth/v1/authv1connect"
	devicev1connect "wargapos/backend/gen/wargapos/device/v1/devicev1connect"
	"wargapos/backend/gen/wargapos/product/v1/productv1connect"
	settingsv1connect "wargapos/backend/gen/wargapos/settings/v1/settingsv1connect"
	stockv1connect "wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/gen/wargapos/table/v1/tablev1connect"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/gen/wargapos/user/v1/userv1connect"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/service/auth_service"
	"wargapos/backend/internal/service/device_service"
	"wargapos/backend/internal/service/product_service"
	"wargapos/backend/internal/service/settings_service"
	"wargapos/backend/internal/service/stock_service"
	"wargapos/backend/internal/service/table_service"
	"wargapos/backend/internal/service/transaction_service"
	"wargapos/backend/internal/service/user_service"
)

// App holds the configured HTTP mux.
type App struct {
	mux *http.ServeMux
}

// NewApp is a Wire provider that wires all service handlers into the HTTP mux.
func NewApp(
	db *gorm.DB,
	cfg *config.Config,
	midtransCfg config.MidtransConfig,
	authCfg config.AuthConfig,
	authSvc *auth_service.AuthService,
	userSvc *user_service.UserService,
	productSvc *product_service.ProductService,
	txSvc *transaction_service.TransactionService,
	tableSvc *table_service.TableService,
	settingsSvc *settings_service.SettingsService,
	stockSvc *stock_service.StockService,
	deviceSvc *device_service.DeviceService,
) *App {
	interceptor := connect.WithInterceptors(validate.NewInterceptor(), auth.NewInterceptor([]byte(authCfg.JWTSecret)))

	mux := http.NewServeMux()
	mux.Handle(authv1connect.NewAuthServiceHandler(authSvc, interceptor))
	mux.Handle(userv1connect.NewUserServiceHandler(userSvc, interceptor))
	mux.Handle(productv1connect.NewProductServiceHandler(productSvc, interceptor))
	mux.Handle(transactionv1connect.NewTransactionServiceHandler(txSvc, interceptor))
	mux.Handle(tablev1connect.NewTableServiceHandler(tableSvc, interceptor))
	mux.Handle(settingsv1connect.NewSettingsServiceHandler(settingsSvc, interceptor))
	mux.Handle(stockv1connect.NewStockServiceHandler(stockSvc, interceptor))
	mux.Handle(devicev1connect.NewDeviceServiceHandler(deviceSvc, interceptor))

	reflector := grpcreflect.NewStaticReflector(
		authv1connect.AuthServiceName,
		userv1connect.UserServiceName,
		productv1connect.ProductServiceName,
		transactionv1connect.TransactionServiceName,
		tablev1connect.TableServiceName,
		settingsv1connect.SettingsServiceName,
		stockv1connect.StockServiceName,
		devicev1connect.DeviceServiceName,
	)
	mux.Handle(grpcreflect.NewHandlerV1(reflector))
	mux.Handle(grpcreflect.NewHandlerV1Alpha(reflector))

	mux.HandleFunc("POST /midtrans/webhook", midtransWebhookHandler(db, midtransCfg))

	uploadDir := cfg.Server.UploadDir
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))
	mux.HandleFunc("POST /upload", uploadHandler(uploadDir, authCfg))

	mux.Handle("/", spaHandler(staticFiles))
	return &App{mux: mux}
}
