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

func (s *StockService) UpdateRack(
	ctx context.Context,
	req *connect.Request[stockv1.UpdateRackRequest],
) (*connect.Response[stockv1.UpdateRackResponse], error) {
	var r models.Rack
	if err := s.db.WithContext(ctx).First(&r, "id = ? AND deleted = false", req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("rack not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := s.db.WithContext(ctx).Model(&r).Updates(map[string]any{
		"name":       req.Msg.Name,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&stockv1.UpdateRackResponse{Rack: toProtoRack(&r)}), nil
}
