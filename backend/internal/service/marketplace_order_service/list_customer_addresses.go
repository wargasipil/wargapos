package marketplace_order_service

import (
	"context"

	marketplacev1 "wargapos/backend/gen/wargapos/marketplace/v1"
	marketplaceorderv1 "wargapos/backend/gen/wargapos/marketplace_order/v1"
	"wargapos/backend/internal/models"

	"connectrpc.com/connect"
)

func (s *MarketplaceOrderService) ListCustomerAddresses(
	ctx context.Context,
	req *connect.Request[marketplaceorderv1.ListCustomerAddressesRequest],
) (*connect.Response[marketplaceorderv1.ListCustomerAddressesResponse], error) {
	var addrs []models.MarketplaceCustomerAddress
	if err := s.db.WithContext(ctx).
		Where("customer_id = ? AND deleted = false", req.Msg.CustomerId).
		Order("created_at asc").
		Find(&addrs).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*marketplacev1.CustomerAddress, len(addrs))
	for i, a := range addrs {
		proto[i] = toAddressProto(a)
	}

	return connect.NewResponse(&marketplaceorderv1.ListCustomerAddressesResponse{
		Addresses: proto,
	}), nil
}
