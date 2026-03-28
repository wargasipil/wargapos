package stock_service

import (
	"context"

	"connectrpc.com/connect"

	stockv1 "wargapos/backend/gen/wargapos/stock/v1"
	"wargapos/backend/internal/models"
)

func (s *StockService) CreateRack(
	ctx context.Context,
	req *connect.Request[stockv1.CreateRackRequest],
) (*connect.Response[stockv1.CreateRackResponse], error) {
	r := models.Rack{
		WarehouseID: req.Msg.WarehouseId,
		Name:        req.Msg.Name,
	}
	if err := s.db.WithContext(ctx).Create(&r).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.CreateRackResponse{Rack: toProtoRack(&r)}), nil
}
