package main

import (
	"net/http"

	"gorm.io/gorm"

	"wargapos/backend/gen/wargapos/auth/v1/authv1connect"
	"wargapos/backend/gen/wargapos/product/v1/productv1connect"
	"wargapos/backend/gen/wargapos/table/v1/tablev1connect"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/gen/wargapos/user/v1/userv1connect"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/service/auth_service"
	"wargapos/backend/internal/service/product_service"
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
) *App {
	mux := http.NewServeMux()
	mux.Handle(authv1connect.NewAuthServiceHandler(authSvc))
	mux.Handle(userv1connect.NewUserServiceHandler(userSvc))
	mux.Handle(productv1connect.NewProductServiceHandler(productSvc))
	mux.Handle(transactionv1connect.NewTransactionServiceHandler(txSvc))
	mux.Handle(tablev1connect.NewTableServiceHandler(tableSvc))
	mux.HandleFunc("POST /midtrans/webhook", midtransWebhookHandler(db, midtransCfg))

	uploadDir := cfg.Server.UploadDir
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))
	mux.HandleFunc("POST /upload", uploadHandler(uploadDir, authCfg))

	mux.Handle("/", spaHandler(staticFiles))
	return &App{mux: mux}
}
