package marketplace_order_service

import (
	"context"

	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) DeleteCustomer(
	ctx context.Context,
	req *connect.Request[marketplaceorderv1.DeleteCustomerRequest],
) (*connect.Response[marketplaceorderv1.DeleteCustomerResponse], error) {
	if err := s.db.WithContext(ctx).Delete(&models.MarketplaceCustomer{}, req.Msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&marketplaceorderv1.DeleteCustomerResponse{}), nil
}
