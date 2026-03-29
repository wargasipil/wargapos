package marketplace_service

import (
	"context"
	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceService) GetOrder(ctx context.Context, req *connect.Request[marketplacev1.GetOrderRequest]) (*connect.Response[marketplacev1.GetOrderResponse], error) {
	var order models.MarketplaceOrder
	if err := s.db.Preload("Shop").Preload("Items").First(&order, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}
	return connect.NewResponse(&marketplacev1.GetOrderResponse{
		Order: toOrderProto(order),
	}), nil
}
