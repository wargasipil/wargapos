package marketplace_order_service

import (
	"context"

	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) GetCustomer(
	ctx context.Context,
	req *connect.Request[marketplaceorderv1.GetCustomerRequest],
) (*connect.Response[marketplaceorderv1.GetCustomerResponse], error) {
	var customer models.MarketplaceCustomer
	if err := s.db.WithContext(ctx).First(&customer, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeNotFound, err)
	}

	return connect.NewResponse(&marketplaceorderv1.GetCustomerResponse{
		Customer: toCustomerProto(customer),
	}), nil
}
