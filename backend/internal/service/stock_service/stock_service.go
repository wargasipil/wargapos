package stock_service

import (
	"gorm.io/gorm"

	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
)

// StockService implements stockv1connect.StockServiceHandler.
type StockService struct {
	db *gorm.DB
}

// NewStockService is the Wire provider constructor.
func NewStockService(db *gorm.DB) *StockService {
	return &StockService{db: db}
}

var _ stockv1connect.StockServiceHandler = (*StockService)(nil)
