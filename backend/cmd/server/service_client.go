package main

import (
	"net/http"
	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/internal/config"

	"connectrpc.com/connect"
)

func NewStockServiceClient(
	cfg *config.Config,
	defaultOpts DefaultServiceClientOption,
) stockv1connect.StockServiceClient {

	return stockv1connect.NewStockServiceClient(
		http.DefaultClient,
		cfg.Server.GetBase(),
		connect.WithGRPC(),
		defaultOpts,
	)
}
