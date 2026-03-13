package main

import (
	"net/http"

	"wargapos/backend/gen/wargapos/auth/v1/authv1connect"
	"wargapos/backend/gen/wargapos/product/v1/productv1connect"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/gen/wargapos/user/v1/userv1connect"
	"wargapos/backend/internal/service/auth_service"
	"wargapos/backend/internal/service/product_service"
	"wargapos/backend/internal/service/transaction_service"
	"wargapos/backend/internal/service/user_service"
)

// App holds the configured HTTP mux.
type App struct {
	mux *http.ServeMux
}

// NewApp is a Wire provider that wires all service handlers into the HTTP mux.
func NewApp(
	authSvc *auth_service.AuthService,
	userSvc *user_service.UserService,
	productSvc *product_service.ProductService,
	txSvc *transaction_service.TransactionService,
) *App {
	mux := http.NewServeMux()
	mux.Handle(authv1connect.NewAuthServiceHandler(authSvc))
	mux.Handle(userv1connect.NewUserServiceHandler(userSvc))
	mux.Handle(productv1connect.NewProductServiceHandler(productSvc))
	mux.Handle(transactionv1connect.NewTransactionServiceHandler(txSvc))
	mux.Handle("/", spaHandler(staticFiles))
	return &App{mux: mux}
}
