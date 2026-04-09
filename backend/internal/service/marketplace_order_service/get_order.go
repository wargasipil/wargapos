package marketplace_order_service

import (
	"context"
	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) GetOrder(ctx context.Context, req *connect.Request[marketplaceorderv1.GetOrderRequest]) (*connect.Response[marketplaceorderv1.GetOrderResponse], error) {
	var order models.MarketplaceOrder
	if err := s.db.Preload("Shop").Preload("Items").First(&order, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	return connect.NewResponse(&marketplaceorderv1.GetOrderResponse{
		Order: toOrderProto(order),
	}), nil
}
