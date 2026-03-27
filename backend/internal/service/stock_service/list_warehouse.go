package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) ListWarehouse(
	ctx context.Context,
	req *connect.Request[stockv1.ListWarehouseRequest],
) (*connect.Response[stockv1.ListWarehouseResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.db.WithContext(ctx).Model(&models.Warehouse{}).Where("deleted = false")
	if req.Msg.Search != "" {
		q = q.Where("name ILIKE ?", "%"+req.Msg.Search+"%")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var warehouses []models.Warehouse
	if err := q.Order("id asc").Limit(pageSize).Offset(offset).Find(&warehouses).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*stockv1.Warehouse, len(warehouses))
	for i := range warehouses {
		proto[i] = toProtoWarehouse(&warehouses[i])
	}

	return connect.NewResponse(&stockv1.ListWarehouseResponse{
		Warehouses: proto,
		Total:      int32(total),
	}), nil
}
