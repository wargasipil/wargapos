package marketplace_service

import (
	"context"
	"time"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) UpdateOrderStatus(ctx context.Context, req *connect.Request[marketplacev1.UpdateOrderStatusRequest]) (*connect.Response[marketplacev1.UpdateOrderStatusResponse], error) {
	var order models.MarketplaceOrder
	if err := s.db.Preload("Items").First(&order, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	if err := s.db.Model(&order).Updates(map[string]interface{}{
		"status":     req.Msg.Status,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	order.Status = req.Msg.Status

	return connect.NewResponse(&marketplacev1.UpdateOrderStatusResponse{
		Order: toOrderProto(order),
	}), nil
}
