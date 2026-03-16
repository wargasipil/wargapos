package main

import (
	"fmt"
	"net/http"

	"connectrpc.com/connect"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"wargapos/backend/gen/wargapos/connector/v1/connectorv1connect"
	"wargapos/backend/internal/config"
	"wargapos/backend/internal/service/connector_service"
)

// App holds the configured HTTP server for the connector.
type App struct {
	addr    string
	handler http.Handler
}

// NewApp is a Wire provider that wires all connector handlers into the HTTP mux.
func NewApp(
	cfg config.ConnectorConfig,
	connSvc *connector_service.ConnectorService,
) *App {
	mux := http.NewServeMux()
	mux.Handle(connectorv1connect.NewConnectorServiceHandler(connSvc,
		connect.WithInterceptors(), // no auth — local service
	))

	addr := cfg.Host + ":" + cfg.Port
	return &App{
		addr:    addr,
		handler: corsMiddleware(h2c.NewHandler(mux, &http2.Server{})),
	}
}

func (a *App) ListenAndServe() error {
	fmt.Printf("WargaPOS connector listening on %s\n", a.addr)
	return http.ListenAndServe(a.addr, a.handler)
}
