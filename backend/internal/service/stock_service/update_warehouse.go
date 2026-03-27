package stock_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	"gorm.io/gorm"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) UpdateWarehouse(
	ctx context.Context,
	req *connect.Request[stockv1.UpdateWarehouseRequest],
) (*connect.Response[stockv1.UpdateWarehouseResponse], error) {
	if req.Msg.Id == 0 || req.Msg.Name == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("id and name are required"))
	}

	var w models.Warehouse
	if err := s.db.WithContext(ctx).First(&w, "id = ? AND deleted = false", req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("warehouse not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := s.db.WithContext(ctx).Model(&w).Updates(map[string]any{
		"name":       req.Msg.Name,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.UpdateWarehouseResponse{Warehouse: toProtoWarehouse(&w)}), nil
}
