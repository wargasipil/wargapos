package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) ListRack(
	ctx context.Context,
	req *connect.Request[stockv1.ListRackRequest],
) (*connect.Response[stockv1.ListRackResponse], error) {
	pageSize := int(req.Msg.PageSize)
	if pageSize <= 0 {
		pageSize = 20
	}
	page := int(req.Msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := s.db.WithContext(ctx).Model(&models.Rack{}).Where("deleted = false")
	if f := req.Msg.Filter; f != nil {
		if f.WarehouseId > 0 {
			q = q.Where("warehouse_id = ?", f.WarehouseId)
		}
		if f.Search != "" {
			q = q.Where("name ILIKE ?", "%"+f.Search+"%")
		}
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var racks []models.Rack
	if err := q.Order("id asc").Limit(pageSize).Offset(offset).Find(&racks).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*stockv1.Rack, len(racks))
	for i := range racks {
		proto[i] = toProtoRack(&racks[i])
	}

	return connect.NewResponse(&stockv1.ListRackResponse{
		Racks: proto,
		Total: int32(total),
	}), nil
}
