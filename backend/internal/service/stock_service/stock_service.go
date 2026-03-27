package stock_service

import (
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/internal/models"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// StockService implements stockv1connect.StockServiceHandler.
type StockService struct {
	stockv1connect.UnimplementedStockServiceHandler
	db *gorm.DB
}

// NewStockService is the Wire provider constructor.
func NewStockService(db *gorm.DB) *StockService {
	return &StockService{db: db}
}

func toProtoWarehouse(w *models.Warehouse) *stockv1.Warehouse {
	return &stockv1.Warehouse{
		Id:        w.ID,
		Name:      w.Name,
		Deleted:   w.Deleted,
		CreatedAt: timestamppb.New(w.CreatedAt),
		UpdatedAt: timestamppb.New(w.UpdatedAt),
	}
}
