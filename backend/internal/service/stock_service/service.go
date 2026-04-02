package stock_service

import (
	"gorm.io/gorm"

	"wargapos/backend/gen/wargapos/event/v1/eventv1connect"
	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/gen/wargapos/stock/v1/stockv1connect"
	"wargapos/backend/internal/models"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// StockService implements stockv1connect.StockServiceHandler.
type StockService struct {
	stockv1connect.UnimplementedStockServiceHandler
	db          *gorm.DB
	eventClient eventv1connect.EventServiceClient
}

// NewStockService is the Wire provider constructor.
func NewStockService(db *gorm.DB, eventClient eventv1connect.EventServiceClient) *StockService {
	return &StockService{db: db, eventClient: eventClient}
}

func toProtoTransaction(t *models.StockTransaction) *stockv1.Transaction {
	items := make([]*stockv1.TransactionItem, len(t.Items))
	for i, it := range t.Items {
		items[i] = &stockv1.TransactionItem{
			SkuId:    it.SkuID,
			Quantity: int32(it.Quantity),
			Total:    float64(it.Price),
			RackId: func() uint32 {
				if it.RackID != nil {
					return *it.RackID
				}
				return 0
			}(),
		}
	}
	return &stockv1.Transaction{
		Id:              t.ID,
		TransactionType: t.TransactionType,
		Note:            t.Note,
		Cancelled:       t.Cancelled,
		CreatedAt:       timestamppb.New(t.CreatedAt),
		Items:           items,
	}
}

func toProtoSku(s *models.Sku) *stockv1.Sku {
	return &stockv1.Sku{
		Id:          s.ID,
		Code:        s.Code,
		ProductId:   s.ProductID,
		BranchId:    s.BranchID,
		WarehouseId: s.WarehouseID,
		ProductType: stockv1.ProductType(s.ProductType),
		Deleted:     s.Deleted,
		LeftStock:   int32(s.StockQty),
		CreatedAt:   timestamppb.New(s.CreatedAt),
		UpdatedAt:   timestamppb.New(s.UpdatedAt),
	}
}

func toProtoRack(r *models.Rack) *stockv1.Rack {
	return &stockv1.Rack{
		Id:          r.ID,
		WarehouseId: r.WarehouseID,
		Name:        r.Name,
		Deleted:     r.Deleted,
		CreatedAt:   timestamppb.New(r.CreatedAt),
		UpdatedAt:   timestamppb.New(r.UpdatedAt),
	}
}

func toProtoWarehouse(w *models.Warehouse) *stockv1.Warehouse {
	return &stockv1.Warehouse{
		Id:        w.ID,
		Name:      w.Name,
		Address:   w.Address,
		Contact:   w.Contact,
		Deleted:   w.Deleted,
		CreatedAt: timestamppb.New(w.CreatedAt),
		UpdatedAt: timestamppb.New(w.UpdatedAt),
	}
}
