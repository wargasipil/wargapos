package marketplace_order_service

import (
	"context"
	"time"
	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) UpdateOrderStatus(ctx context.Context, req *connect.Request[marketplaceorderv1.UpdateOrderStatusRequest]) (*connect.Response[marketplaceorderv1.UpdateOrderStatusResponse], error) {
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

	return connect.NewResponse(&marketplaceorderv1.UpdateOrderStatusResponse{
		Order: toOrderProto(order),
	}), nil
}
