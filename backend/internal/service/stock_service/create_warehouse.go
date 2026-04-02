package stock_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) CreateWarehouse(
	ctx context.Context,
	req *connect.Request[stockv1.CreateWarehouseRequest],
) (*connect.Response[stockv1.CreateWarehouseResponse], error) {
	if req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name is required"))
	}

	w := models.Warehouse{Name: req.Msg.Name, Address: req.Msg.Address, Contact: req.Msg.Contact}
	if err := s.db.WithContext(ctx).Create(&w).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.CreateWarehouseResponse{Warehouse: toProtoWarehouse(&w)}), nil
}
