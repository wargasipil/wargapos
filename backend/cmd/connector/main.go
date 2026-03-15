package main

import (
	"fmt"
	"log"
	"net/http"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"wargapos/backend/gen/wargapos/printer/v1/printerv1connect"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/service/printer_service"
)

func main() {
	cfg := config.Load()
	pc := config.ProvidePrinterConfig(cfg)

	svc := printer_service.NewPrinterService(pc)

	mux := http.NewServeMux()
	mux.Handle(printerv1connect.NewPrinterServiceHandler(svc,
		connect.WithInterceptors(), // no auth — local service
	))

	addr := ":" + pc.Port
	fmt.Printf("WargaPOS connector listening on %s (printer: %s)\n", addr, pc.Address)

	handler := corsMiddleware(h2c.NewHandler(mux, &http2.Server{}))
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("connector error: %v", err)
	}
}

// corsMiddleware allows cross-origin requests from the browser.
// The connector is a local service so * is acceptable.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
