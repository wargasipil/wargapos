package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"wargapos/backend/gen/wargapos/auth/v1/authv1connect"
	backupv1connect "wargapos/backend/gen/wargapos/backup/v1/backupv1connect"
	devicev1connect "wargapos/backend/gen/wargapos/device/v1/devicev1connect"
	ingredientv1connect "wargapos/backend/gen/wargapos/ingredient/v1/ingredientv1connect"
	notificationv1connect "wargapos/backend/gen/wargapos/notification/v1/notificationv1connect"
	"wargapos/backend/gen/wargapos/product/v1/productv1connect"
	settingsv1connect "wargapos/backend/gen/wargapos/settings/v1/settingsv1connect"
	stockv1connect "wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/gen/wargapos/table/v1/tablev1connect"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/gen/wargapos/user/v1/userv1connect"
	"wargapos/backend/internal/auth"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/service/auth_service"
	"wargapos/backend/internal/service/backup_service"
	"wargapos/backend/internal/service/device_service"
	"wargapos/backend/internal/service/ingredient_service"
	"wargapos/backend/internal/service/notification_service"
	"wargapos/backend/internal/service/product_service"
	"wargapos/backend/internal/service/settings_service"
	"wargapos/backend/internal/service/stock_service"
	"wargapos/backend/internal/service/table_service"
	"wargapos/backend/internal/service/transaction_service"
	"wargapos/backend/internal/service/user_service"
	"wargapos/backend/pkgs/runner"

	"connectrpc.com/connect"
	"connectrpc.com/grpcreflect"
	"connectrpc.com/validate"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	"gorm.io/gorm"
)

type WebRunnerFunc runner.RunnerFunc

func NewWebRunnerFunc(
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
	ingredientSvc *ingredient_service.IngredientService,
	deviceSvc *device_service.DeviceService,
	notifSvc *notification_service.NotificationService,
	backupSvc *backup_service.BackupService,
) WebRunnerFunc {

	interceptor := connect.WithInterceptors(
		auth.NewAuthTokenInterceptor(),
		validate.NewInterceptor(),
		auth.NewInterceptor([]byte(authCfg.JWTSecret)),
	)

	mux := http.NewServeMux()
	mux.Handle(authv1connect.NewAuthServiceHandler(authSvc, interceptor))
	mux.Handle(userv1connect.NewUserServiceHandler(userSvc, interceptor))
	mux.Handle(productv1connect.NewProductServiceHandler(productSvc, interceptor))
	mux.Handle(transactionv1connect.NewTransactionServiceHandler(txSvc, interceptor))
	mux.Handle(tablev1connect.NewTableServiceHandler(tableSvc, interceptor))
	mux.Handle(settingsv1connect.NewSettingsServiceHandler(settingsSvc, interceptor))
	mux.Handle(stockv1connect.NewStockServiceHandler(stockSvc, interceptor))
	mux.Handle(ingredientv1connect.NewIngredientServiceHandler(ingredientSvc, interceptor))
	mux.Handle(devicev1connect.NewDeviceServiceHandler(deviceSvc, interceptor))
	mux.Handle(notificationv1connect.NewNotificationServiceHandler(notifSvc, interceptor))
	mux.Handle(backupv1connect.NewBackupServiceHandler(backupSvc, interceptor))

	reflector := grpcreflect.NewStaticReflector(
		authv1connect.AuthServiceName,
		userv1connect.UserServiceName,
		productv1connect.ProductServiceName,
		transactionv1connect.TransactionServiceName,
		tablev1connect.TableServiceName,
		settingsv1connect.SettingsServiceName,
		stockv1connect.StockServiceName,
		ingredientv1connect.IngredientServiceName,
		devicev1connect.DeviceServiceName,
		notificationv1connect.NotificationServiceName,
		backupv1connect.BackupServiceName,
	)
	mux.Handle(grpcreflect.NewHandlerV1(reflector))
	mux.Handle(grpcreflect.NewHandlerV1Alpha(reflector))

	mux.HandleFunc("GET /backup/download-existing", backupSvc.ServeDownload)
	mux.HandleFunc("POST /backup/restore-upload", backupSvc.ServeRestoreUpload)

	mux.HandleFunc("POST /midtrans/webhook", midtransWebhookHandler(db, midtransCfg))

	// First-run setup endpoints — no auth required, become no-ops after first user created
	mux.HandleFunc("GET /setup-needed", setupNeededHandler(db))
	mux.HandleFunc("POST /setup", setupHandler(db, authCfg))

	uploadDir := cfg.Server.UploadDir
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadDir))))
	mux.HandleFunc("POST /upload", uploadHandler(uploadDir, authCfg))

	mux.Handle("/", spaHandler(staticFiles))

	// register runner

	return func(wctx *runner.RunnerContext) error {

		addr := cfg.Server.Host + ":" + cfg.Server.Port
		fmt.Printf("WargaPOS backend listening on %s\n", addr)

		if err := http.ListenAndServe(addr, h2c.NewHandler(mux, &http2.Server{})); err != nil {
			log.Fatalf("server error: %v", err)
		}

		return nil
	}
}

// spaHandler serves files from the embedded static/ directory.
// For paths that don't match a file, it falls back to index.html
// so that React Router can handle client-side navigation.
func spaHandler(fsys embed.FS) http.Handler {
	sub, err := fs.Sub(fsys, "static")
	if err != nil {
		log.Fatalf("failed to sub static fs: %v", err)
	}
	fileServer := http.FileServer(http.FS(sub))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check whether the requested path exists as a real file.
		path := r.URL.Path
		if len(path) > 0 && path[0] == '/' {
			path = path[1:]
		}
		f, err := sub.Open(path)
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}
		// Not a file — serve index.html so React Router handles the route.
		data, err := fsys.ReadFile("static/index.html")
		if err != nil {
			http.Error(w, "frontend not built — run: make build", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(data)
	})
}
