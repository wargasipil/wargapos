package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) GetWarehouse(
	ctx context.Context,
	req *connect.Request[stockv1.GetWarehouseRequest],
) (*connect.Response[stockv1.GetWarehouseResponse], error) {
	var warehouses []models.Warehouse
	if err := s.db.WithContext(ctx).
		Where("id IN ? AND deleted = false", req.Msg.Ids).
		Find(&warehouses).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	result := make(map[uint32]*stockv1.Warehouse, len(warehouses))
	for i := range warehouses {
		result[warehouses[i].ID] = toProtoWarehouse(&warehouses[i])
	}

	return connect.NewResponse(&stockv1.GetWarehouseResponse{Warehouses: result}), nil
}
