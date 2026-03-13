package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"wargapos/backend/internal/config"
	"wargapos/backend/internal/db"
	"wargapos/backend/internal/handler"

	"wargapos/backend/gen/wargapos/auth/v1/authv1connect"
	"wargapos/backend/gen/wargapos/product/v1/productv1connect"
	"wargapos/backend/gen/wargapos/transaction/v1/transactionv1connect"
	"wargapos/backend/gen/wargapos/user/v1/userv1connect"
)

//go:embed static
var staticFiles embed.FS

func main() {
	cfg := config.Load()
	db.Connect(cfg)

	mux := http.NewServeMux()

	// Connect RPC handlers — registered first so they take priority
	mux.Handle(authv1connect.NewAuthServiceHandler(&handler.AuthHandler{}))
	mux.Handle(userv1connect.NewUserServiceHandler(&handler.UserHandler{}))
	mux.Handle(productv1connect.NewProductServiceHandler(&handler.ProductHandler{}))
	mux.Handle(transactionv1connect.NewTransactionServiceHandler(&handler.TransactionHandler{}))

	// SPA fallback — serves static files, falls back to index.html for client-side routing
	mux.Handle("/", spaHandler(staticFiles))

	addr := cfg.Server.Host + ":" + cfg.Server.Port
	fmt.Printf("WargaPOS backend listening on %s\n", addr)

	if err := http.ListenAndServe(addr, h2c.NewHandler(mux, &http2.Server{})); err != nil {
		log.Fatalf("server error: %v", err)
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
